import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
(global as any).self = global;
import { AnalyzeComplianceDto, GetComplianceHistoryDto, SaveComplianceDto } from './core/dto/compliance-request.dto';
import { ComplianceEntity } from './core/entities/compliance.entity';
const shp = require('shpjs');

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadLocation(file: Express.Multer.File, name?: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let geojson: any = null;
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'zip') {
        // Parse Shapefile
        geojson = await shp(file.buffer);
      } else if (ext === 'geojson' || ext === 'json') {
        // Parse GeoJSON
        geojson = JSON.parse(file.buffer.toString('utf-8'));
      } else {
        throw new BadRequestException('Hanya mendukung format .zip (Shapefile) atau .geojson');
      }
    } catch (error: any) {
      throw new BadRequestException(`Gagal memproses file: ${error.message}`);
    }

    // Extract the first polygon or multipolygon
    let geometry = null;
    if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
      geometry = geojson.features[0].geometry;
    } else if (geojson.type === 'Feature') {
      geometry = geojson.geometry;
    } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
      geometry = geojson;
    }

    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
      throw new BadRequestException('Berkas harus mengandung minimal satu Polygon atau MultiPolygon valid');
    }

    const geometryString = JSON.stringify(geometry);

    // Create the upload record first
    const upload = await this.prisma.complianceUpload.create({
      data: {
        name: name || file.originalname,
        area_m2: 0,
        centroid_lat: 0,
        centroid_lng: 0,
        bounds_min_lat: 0,
        bounds_max_lat: 0,
        bounds_min_lng: 0,
        bounds_max_lng: 0,
      }
    });

    // Update with PostGIS geometry and calculate metrics
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH inserted AS (
        UPDATE compliance_uploads 
        SET geom = ST_SetSRID(ST_GeomFromGeoJSON('${geometryString}'), 4326)
        WHERE id = '${upload.id}'
        RETURNING geom
      )
      SELECT 
        ST_Area(geom::geography) AS area_m2,
        ST_Y(ST_Centroid(geom)) AS centroid_lat,
        ST_X(ST_Centroid(geom)) AS centroid_lng,
        ST_YMin(geom) AS min_lat,
        ST_YMax(geom) AS max_lat,
        ST_XMin(geom) AS min_lng,
        ST_XMax(geom) AS max_lng
      FROM inserted
    `);

    if (!result || result.length === 0) {
      throw new BadRequestException('Geometri tidak valid (mungkin menyilang atau tidak tertutup)');
    }

    const metrics = result[0];
    
    // Save calculated metrics
    const finalUpload = await this.prisma.complianceUpload.update({
      where: { id: upload.id },
      data: {
        area_m2: metrics.area_m2,
        centroid_lat: metrics.centroid_lat,
        centroid_lng: metrics.centroid_lng,
        bounds_min_lat: metrics.min_lat,
        bounds_max_lat: metrics.max_lat,
        bounds_min_lng: metrics.min_lng,
        bounds_max_lng: metrics.max_lng,
      }
    });

    return {
      id: finalUpload.id,
      name: finalUpload.name,
      geometry_type: geometry.type,
      area_m2: finalUpload.area_m2,
      centroid: { lat: finalUpload.centroid_lat, lng: finalUpload.centroid_lng },
      bounds: {
        minLat: finalUpload.bounds_min_lat,
        maxLat: finalUpload.bounds_max_lat,
        minLng: finalUpload.bounds_min_lng,
        maxLng: finalUpload.bounds_max_lng
      }
    };
  }

  async analyzeCompliance(uploadId: string, intendedUse: string) {
    const uploads = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT *, ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001)) as geom_geojson 
      FROM compliance_uploads 
      WHERE id = '${uploadId}'
    `);

    if (uploads.length === 0) {
      throw new NotFoundException('Data unggahan tidak ditemukan');
    }
    const upload = uploads[0];
    const uploadGeom = upload.geom_geojson ? JSON.parse(upload.geom_geojson) : null;

    // Find RDTR layer id
    const layer = await this.prisma.layer.findFirst({ where: { name: 'rdtr' } });
    if (!layer) {
      return this.generateEmptyResult(upload, uploadGeom, intendedUse);
    }

    // Intersect with RDTR features
    const intersections = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        f.properties,
        ST_Area(ST_Intersection(u.geom, f.geom)::geography) / ST_Area(u.geom::geography) * 100 AS overlap_percent,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(f.geom, 0.001)) as rdtr_geom,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Intersection(u.geom, f.geom), 0.001)) as intersection_geom
      FROM features f, compliance_uploads u
      WHERE u.id = '${uploadId}' 
        AND f.layer_id = '${layer.id}' 
        AND ST_Intersects(u.geom, f.geom)
    `);

    if (intersections.length === 0) {
      return this.generateEmptyResult(upload, uploadGeom, intendedUse);
    }

    const zones = intersections.map(i => {
      const p = i.properties;
      return {
        zone_code: p.zone_code || p.KODZON || p.KODSZN || 'UNKNOWN',
        zone_name: p.zone_name || p.NAMZON || p.NAMSZN || 'Zona Tidak Diketahui',
        overlap_percent: parseFloat(i.overlap_percent),
        rules: {
          kdb_max: p.kdb_max ?? p.KDB ?? null,
          klb_max: p.klb_max ?? p.KLB ?? null,
          kdh_min: p.kdh_min ?? p.KDH ?? null,
          gsb_m: p.gsb_m ?? p.GSB ?? null
        },
        region_name: p.WADMKK || p.WADMPR || null,
        geojson: i.rdtr_geom ? JSON.parse(i.rdtr_geom) : null,
        intersection_geojson: i.intersection_geom ? JSON.parse(i.intersection_geom) : null
      };
    }).sort((a, b) => b.overlap_percent - a.overlap_percent);

    // Business Logic for Verdict
    const dominantZone = zones[0];
    let verdict = 'perlu_diperiksa';
    const findings = [];

    const isResidentialAllowed = dominantZone.zone_code.startsWith('R-') || dominantZone.zone_code.startsWith('K-');
    const isCommercialAllowed = dominantZone.zone_code.startsWith('K-');
    const isGreenSpace = dominantZone.zone_code.startsWith('RTH');

    if (isGreenSpace) {
      verdict = 'tidak_sesuai';
      findings.push({
        status: 'tidak_sesuai',
        title: 'Lahan berada pada Ruang Terbuka Hijau',
        detail: 'Pembangunan pada zona RTH dilarang.',
        basis: 'Perda RDTR Setempat'
      });
    } else if (intendedUse === 'residential' && isResidentialAllowed) {
      verdict = 'sesuai';
      findings.push({
        status: 'sesuai',
        title: 'Peruntukan sesuai zona dominan',
        detail: 'Peruntukan perumahan diizinkan pada zona ' + dominantZone.zone_code,
        basis: 'Perda RDTR Setempat'
      });
    } else if (intendedUse === 'retail' && isCommercialAllowed) {
      verdict = 'sesuai';
      findings.push({
        status: 'sesuai',
        title: 'Peruntukan sesuai zona dominan',
        detail: 'Peruntukan komersial diizinkan pada zona ' + dominantZone.zone_code,
        basis: 'Perda RDTR Setempat'
      });
    } else {
      findings.push({
        status: 'perlu_diperiksa',
        title: 'Peruntukan mungkin tidak sesuai dengan zona dominan',
        detail: 'Zona ' + dominantZone.zone_code + ' perlu ditelaah lebih lanjut untuk peruntukan ' + intendedUse,
        basis: 'Perda RDTR Setempat'
      });
    }

    if (zones.length > 1) {
      findings.push({
        status: 'perlu_diperiksa',
        title: 'Sebagian lahan menyeberang zona lain',
        detail: 'Persil melintasi lebih dari satu zona RDTR.',
        basis: null
      });
      verdict = 'perlu_diperiksa';
    }

    return {
      verdict,
      intended_use: intendedUse,
      location: {
        name: upload.name || 'Untitled Area',
        area_m2: upload.area_m2,
        centroid: { lat: upload.centroid_lat, lng: upload.centroid_lng },
        geojson: uploadGeom
      },
      rdtr: {
        available: true,
        region: dominantZone.region_name || 'Tidak Diketahui',
        regulation: 'Perda RDTR Setempat',
        year: 2024,
        source_url: 'https://gistaru.atrbpn.go.id'
      },
      zones,
      findings
    };
  }

  private generateEmptyResult(upload: any, uploadGeom: any, intendedUse: string) {
    return {
      verdict: 'rdtr_tidak_tersedia',
      intended_use: intendedUse,
      location: {
        name: upload.name,
        area_m2: upload.area_m2,
        centroid: { lat: upload.centroid_lat, lng: upload.centroid_lng },
        geojson: uploadGeom
      },
      rdtr: {
        available: false,
        region: null,
        regulation: null,
        year: null,
        source_url: null
      },
      zones: [],
      findings: [
        {
          status: 'rdtr_tidak_tersedia',
          title: 'Data RDTR tidak tersedia',
          detail: 'Belum ada data RDTR yang didigitasi untuk koordinat lahan ini.',
          basis: null
        }
      ]
    };
  }

  async saveCompliance(userId: number, data: SaveComplianceDto) { // 👈 Diubah ke number
    return this.prisma.compliance.create({
      data: {
        user_id: Number(userId), // 👈 Dibungkus Number()
        name: data.location.name || 'Untitled Compliance',
        intended_use: data.intended_use,
        verdict: data.verdict,
        area_m2: data.location.area_m2,
        centroid: {
          lat: data.location.centroid?.lat,
          lng: data.location.centroid?.lng,
          geojson: (data.location as any).geojson || null
        },
        rdtr: data.rdtr,
        zones: data.zones as any,
        findings: data.findings as any,
      }
    });
  }

  async getHistory(userId: number, dto: GetComplianceHistoryDto) { // 👈 Diubah ke number
    const whereClause: any = { user_id: Number(userId) }; // 👈 Dibungkus Number()
    
    if (dto.search) {
      whereClause.name = { contains: dto.search, mode: 'insensitive' };
    }

    const records = await this.prisma.compliance.findMany({
      where: whereClause,
      orderBy: { created_at: dto.sort || 'desc' },
      select: {
        id: true,
        user_id: true,
        name: true,
        intended_use: true,
        verdict: true,
        area_m2: true,
        created_at: true,
        updated_at: true,
      },
    });
    
    return records;
  }

  async getHistoryDetail(userId: number, id: string) { // 👈 Diubah ke number
    const record = await this.prisma.compliance.findUnique({ where: { id } });
    if (!record || Number(record.user_id) !== Number(userId)) {
      throw new NotFoundException('Data tidak ditemukan');
    }
    return new ComplianceEntity(record);
  }

  async deleteHistory(userId: number, id: string) { // 👈 Diubah ke number
    const record = await this.prisma.compliance.findUnique({ where: { id } });
    if (!record || Number(record.user_id) !== Number(userId)) { // 👈 Diperbaiki dengan Number()
      throw new NotFoundException('Data tidak ditemukan');
    }
    await this.prisma.compliance.delete({ where: { id } });
    return { message: 'Berhasil dihapus' };
  }
}