import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { GetHistoryDto } from './core/dto/history-request.dto';
import { AnalysisEntity } from '../analysis/core/entities/analysis.entity';
import { AnalysisTransformHelper } from '../analysis/core/helpers/analysis-transform.helper';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, dto: GetHistoryDto): Promise<AnalysisEntity[]> {
    const whereClause: any = {
      user_id: Number(userId),
    };

    if (dto.search) {
      whereClause.title = { contains: dto.search, mode: 'insensitive' };
    }

    if (dto.layerName) {
      whereClause.layer = { name: dto.layerName };
    }

    const analyses = await this.prisma.analysis.findMany({
      where: whereClause,
      orderBy: { created_at: dto.sort || 'desc' },
      include: { layer: true },
    });

    return AnalysisTransformHelper.toEntities(analyses as any);
  }

  async findOne(analysisId: string, userId: number): Promise<AnalysisEntity> {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { layer: true },
    });

    if (!analysis || Number(analysis.user_id) !== Number(userId)) {
      throw new NotFoundException('Analysis not found');
    }

    return AnalysisTransformHelper.toEntity(analysis as any);
  }

  async getTable(analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { layer: true },
    });
    
    if (!analysis) throw new NotFoundException('Analysis not found');

    const competitors = (analysis as any).competitors || [];
    return competitors;
  }

  async delete(analysisId: string, userId: number) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || Number(analysis.user_id) !== Number(userId)) {
      throw new NotFoundException('Analysis not found');
    }

    await this.prisma.analysis.delete({
      where: { id: analysisId },
    });

    return { success: true };
  }
}