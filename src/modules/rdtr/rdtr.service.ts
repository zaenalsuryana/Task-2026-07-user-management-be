import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import JSONStream from 'JSONStream';
import * as unzipper from 'unzipper';

@Injectable()
export class RdtrService {
  constructor(private readonly prisma: PrismaService) {}

  async getZones(minLat?: number, maxLat?: number, minLng?: number, maxLng?: number) {
    let whereClause = '';
    let tolerance = 0.001;
    
    if (minLat !== undefined && maxLat !== undefined && minLng !== undefined && maxLng !== undefined) {
      whereClause = `
        AND ST_Intersects(
          geom,
          ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
        )
      `;
      
      const width = Math.abs(maxLng - minLng);
      if (width > 2.0) {
        tolerance = 0.01;      // Sangat kasar untuk zoom out jauh (> 200km)
      } else if (width > 0.5) {
        tolerance = 0.005;     // Menengah untuk zoom out sedang
      } else if (width < 0.05) {
        tolerance = 0.0001;    // Sangat detail untuk zoom in dekat (< 5km)
      }
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        id, 
        COALESCE(properties->>'zone_code', properties->>'KODZON', properties->>'KODSZN', 'UNKNOWN') AS zone_code,
        COALESCE(properties->>'zone_name', properties->>'NAMZON', properties->>'NAMSZN', 'Unknown') AS zone_name,
        COALESCE(properties->>'WADMKK', properties->>'WADMPR') AS region_name,
        properties->>'color' AS color,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, ${tolerance}))::json AS geometry
      FROM features
      WHERE layer_id = (SELECT id FROM layers WHERE name = 'rdtr' LIMIT 1)
      ${whereClause}
      LIMIT 3000
    `);

    return {
      type: 'FeatureCollection',
      features: result.map(row => ({
        type: 'Feature',
        id: row.id,
        properties: {
          zone_code: row.zone_code,
          zone_name: row.zone_name,
          region_name: row.region_name,
          color: row.color,
        },
        geometry: row.geometry,
      }))
    };
  }

  async getZoneById(featureId: string) {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        f.id,
        f.properties,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(f.geom, 0.001)) as geom_geojson,
        ST_Area(f.geom::geography) as area_m2
      FROM features f
      WHERE f.id = '${featureId}' 
        AND f.layer_id = (SELECT id FROM layers WHERE name = 'rdtr' LIMIT 1)
    `);

    if (result.length === 0) {
      return null;
    }

    const r = result[0];
    const p = r.properties;
    return {
      id: r.id,
      zone_code: p.zone_code || p.KODZON || p.KODSZN || null,
      zone_name: p.zone_name || p.NAMZON || p.NAMSZN || null,
      region_name: p.WADMKK || p.WADMPR || null,
      rules: {
        kdb_max: p.kdb_max ?? p.KDB ?? null,
        klb_max: p.klb_max ?? p.KLB ?? null,
        kdh_min: p.kdh_min ?? p.KDH ?? null,
        gsb_m: p.gsb_m ?? p.GSB ?? null,
      },
      area_m2: r.area_m2,
      geojson: r.geom_geojson ? JSON.parse(r.geom_geojson) : null,
      properties: p,
    };
  }

  async getLegend() {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COALESCE(properties->>'zone_code', properties->>'KODZON', properties->>'KODSZN', 'UNKNOWN') AS zone_code, 
        COALESCE(properties->>'zone_name', properties->>'NAMZON', properties->>'NAMSZN', 'Unknown Zone') AS zone_name, 
        properties->>'color' AS color
      FROM features
      WHERE layer_id = (SELECT id FROM layers WHERE name = 'rdtr' LIMIT 1)
      GROUP BY 1, 2, 3
    `);

    // Function to generate random hex color for zones without color
    const getRandomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

    return result.map(row => ({
      zone_code: row.zone_code,
      zone_name: row.zone_name,
      color: row.color || getRandomColor()
    }));
  }

  async processRdtrFile(filePath: string, originalName: string) {
    const logger = new Logger(RdtrService.name);
    logger.log(`Starting background processing for uploaded RDTR file: ${originalName}`);

    let tempDir = '';
    let targetFilePath = filePath;

    try {
      let rdtrLayer = await this.prisma.layer.findFirst({ where: { name: 'rdtr' } });
      if (!rdtrLayer) {
        rdtrLayer = await this.prisma.layer.create({
          data: { name: 'rdtr', description: 'Rencana Detail Tata Ruang (RDTR) Polygons' },
        });
      }

      // Check if file is a zip
      if (originalName.toLowerCase().endsWith('.zip')) {
        tempDir = path.join(path.dirname(filePath), 'temp_' + Date.now());
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }
        
        logger.log(`Extracting ZIP file ${originalName} to temporary directory...`);
        await fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: tempDir }))
          .promise();

        // Scan for json or geojson file
        const files = fs.readdirSync(tempDir);
        const jsonFile = files.find(f => f.endsWith('.json') || f.endsWith('.geojson'));
        
        if (!jsonFile) {
          throw new Error('No .json or .geojson file found inside the uploaded ZIP archive');
        }
        
        targetFilePath = path.join(tempDir, jsonFile);
        originalName = jsonFile; // Override original name so streamPath is correct
        logger.log(`Extracted and found JSON file: ${originalName}`);
      }

      // Determine stream path based on filename or format
      const streamPath = originalName.toLowerCase().includes('bandung') ? 'data.*' : 'features.*';

      const stream = fs.createReadStream(targetFilePath, { encoding: 'utf8' });
      const parser = JSONStream.parse(streamPath);
      
      let promises: Promise<void>[] = [];
      let batchSize = 100;
      let isPaused = false;
      let totalSeeded = 0;

      parser.on('data', async (feature: any) => {
        const props = feature.properties || feature.arcgis_attributes || feature;
        
        const promise = (async () => {
          const record = await this.prisma.feature.create({
            data: {
              layer_id: rdtrLayer!.id,
              name: props.zone_name || props.NAMZON || props.zone_code || props.KODZON || props.NAMOBJ || 'RDTR Zone',
              properties: props,
            },
          });

          const geometryString = feature.geometry ? JSON.stringify(feature.geometry) : null;
          if (geometryString) {
            await this.prisma.$executeRawUnsafe(`
              UPDATE features 
              SET geom = ST_SetSRID(ST_GeomFromGeoJSON('${geometryString}'), 4326) 
              WHERE id = '${record.id}'
            `);
          }
          totalSeeded++;
        })();

        promises.push(promise);
        
        if (promises.length >= batchSize && !isPaused) {
          isPaused = true;
          parser.pause();
          
          await Promise.all(promises);
          promises = [];
          
          isPaused = false;
          parser.resume();
        }
      });

      parser.on('end', async () => {
        if (promises.length > 0) {
          await Promise.all(promises);
        }
        logger.log(`✅ Finished parsing ${originalName}. Total seeded: ${totalSeeded}`);
        
        // Clean up extracted file and zip
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      parser.on('error', (err: any) => {
        logger.error(`❌ Error parsing ${originalName}:`, err);
        // Clean up on error
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      stream.pipe(parser);
    } catch (error) {
      logger.error(`Failed to process uploaded RDTR file ${originalName}`, error);
      
      // Clean up on error
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
