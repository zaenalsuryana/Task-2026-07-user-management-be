import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AnalysisPreviewDto,
  AnalysisTableDto,
  CreateAnalysisDto,
} from './core/dto/analysis-request.dto';
import { AnalysisTransformHelper } from './core/helpers/analysis-transform.helper';
import { AnalysisEntity } from './core/entities/analysis.entity';

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  // PUBLIC METHODS

  async preview(dto: AnalysisPreviewDto) {
    return this.calculateDistances(dto.layerName, dto.lat, dto.lng, dto.radiusM);
  }

  async getTableFromPreview(dto: AnalysisPreviewDto) {
    return this.calculateDistances(dto.layerName, dto.lat, dto.lng, dto.radiusM);
  }

  async create(userId: number, dto: CreateAnalysisDto): Promise<AnalysisEntity> {
    const layer = await this.prisma.layer.findFirst({
      where: { name: dto.layerName }
    });

    if (!layer) {
      throw new NotFoundException(`Layer '${dto.layerName}' not found.`);
    }

    const results = await this.calculateDistances(dto.layerName, dto.lat, dto.lng, dto.radiusM);
    const total_competitors = results.length;

    const analysis = await this.prisma.analysis.create({
      data: {
        user_id: Number(userId),
        layer_id: layer.id,
        latitude: dto.lat,
        longitude: dto.lng,
        radius_m: dto.radiusM,
        title: dto.title,
        total_competitors,
        competitors: results,
      },
      include: { layer: true }
    });

    return AnalysisTransformHelper.toEntity(analysis as any);
  }

  // PRIVATE HELPER METHODS

  private async calculateDistances(layerName: string, lat: number, lng: number, radiusM: number) {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM (
        SELECT 
          f.id, f.name, f.properties,
          ST_X(f.geom) as longitude, ST_Y(f.geom) as latitude,
          ST_DistanceSphere(f.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) AS distance
        FROM features f
        JOIN layers l ON f.layer_id = l.id
        WHERE f.geom IS NOT NULL 
          AND ST_DWithin(f.geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
          AND (LOWER(l.name) = LOWER(${layerName}))
      ) AS distances
      ORDER BY distance;
    `;

    return results;
  }
}
