import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import JSONStream from 'JSONStream';

export const seedRdtr = async (prisma: PrismaClient) => {
  let rdtrLayer = await prisma.layer.findFirst({ where: { name: 'rdtr' } });
  if (!rdtrLayer) {
    rdtrLayer = await prisma.layer.create({
      data: { name: 'rdtr', description: 'Rencana Detail Tata Ruang (RDTR) Polygons' },
    });
  }

  // Delete existing features for this layer
  await prisma.feature.deleteMany({
    where: { layer_id: rdtrLayer.id }
  });

  const files = [
    { name: 'rdtr_tangsel.json', streamPath: 'features.*' },
    { name: 'RDTR_13A3_KOTA_BUKIT_TINGGI_LENGKAP.geojson', streamPath: 'features.*' },
    { name: 'RDTR_35I4_KOTA_MALANG_LENGKAP.geojson', streamPath: 'features.*' },
    { name: 'RDTR_33D9_KECAMATAN_KALIWUNGU_LENGKAP.geojson', streamPath: 'features.*' },
    { name: 'RDTR_33E1_KECAMATAN_BRANGSONG_LENGKAP.geojson', streamPath: 'features.*' },
    { name: 'data_semua_zona_bandung.json', streamPath: 'data.*' },
  ];

  let totalSeeded = 0;

  for (const { name, streamPath } of files) {
    const filePath = path.join(__dirname, 'data', name);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${name}`);
      continue;
    }

    console.log(`Loading data from ${name}...`);

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const parser = JSONStream.parse(streamPath);
      
      let promises: Promise<void>[] = [];
      let batchSize = 100;
      let isPaused = false;

      parser.on('data', async (feature: any) => {
        const props = feature.properties || feature.arcgis_attributes || feature;
        
        const promise = (async () => {
          const record = await prisma.feature.create({
            data: {
              layer_id: rdtrLayer!.id,
              name: props.zone_name || props.NAMZON || props.zone_code || props.KODZON || props.NAMOBJ || 'RDTR Zone',
              properties: props,
            },
          });

          const geometryString = feature.geometry ? JSON.stringify(feature.geometry) : null;
          if (geometryString) {
            await prisma.$executeRawUnsafe(`
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
        console.log(`✅ Finished parsing ${name}`);
        resolve();
      });

      parser.on('error', (err: any) => {
        console.error(`❌ Error parsing ${name}:`, err);
        reject(err);
      });

      stream.pipe(parser);
    });
  }

  console.log(`✅ ${totalSeeded} RDTR Features seeded and PostGIS indexed`);
};
