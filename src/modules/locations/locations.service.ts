import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  async getLayers() {
    return this.prisma.layer.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async importData(buffer: Buffer, layerName: string, layerCategory?: string): Promise<{ message: string }> {
    const dataArray = this.parseFileBuffer(buffer);
    if (!dataArray || dataArray.length === 0) {
      throw new BadRequestException('GeoJSON is empty');
    }

    const normalizedCategory = layerCategory || null;

    let layer = await this.prisma.layer.findFirst({
      where: { 
        name: layerName,
        category: normalizedCategory
      }
    });

    if (!layer) {
      layer = await this.prisma.layer.create({
        data: { name: layerName, category: normalizedCategory }
      });
    }

    let createdCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const prop of dataArray) {
        const name = String(prop.name || prop.property_name || prop.title || prop.shop || prop.amenity || 'Unnamed Feature');
        
        const lat = this.parseFloatNumber(prop.lat || prop.latitude);
        const lon = this.parseFloatNumber(prop.lon || prop.longitude);

        if (lat === 0 && lon === 0) continue; 

        const feature = await tx.feature.create({
          data: {
            layer_id: layer.id,
            name,
            properties: prop,
          }
        });
        
        await tx.$executeRawUnsafe(`
          UPDATE features 
          SET geom = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) 
          WHERE id = '${feature.id}'
        `);
        
        createdCount++;
      }
    });

    return { message: `Successfully imported ${createdCount} features into layer '${layerName}'` };
  }

  async getLayerFeatures(layerId: string) {
    const layer = await this.prisma.layer.findUnique({
      where: { id: layerId }
    });
    if (!layer) throw new BadRequestException('Layer not found');

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        id, 
        name,
        properties, 
        ST_AsGeoJSON(geom)::json AS geometry
      FROM features
      WHERE layer_id = '${layerId}'
    `);

    return {
      type: 'FeatureCollection',
      layer: layer,
      features: result.map(row => ({
        type: 'Feature',
        id: row.id,
        properties: { ...row.properties, name: row.name },
        geometry: row.geometry,
      }))
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private parseFileBuffer(buffer: Buffer): any[] {
    try {
      const jsonStr = buffer.toString('utf-8');
      const geojson = JSON.parse(jsonStr);

      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        return geojson.features.map((feature: any) => ({
          ...feature.properties,
          lat: feature.geometry?.coordinates?.[1],
          lon: feature.geometry?.coordinates?.[0],
        }));
      }
      return Array.isArray(geojson) ? geojson : [geojson];
    } catch (error) {
      throw new BadRequestException('Invalid GeoJSON/JSON file');
    }
  }

  private parseFloatNumber(val: any): number {
    if (val === undefined || val === null) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
}
