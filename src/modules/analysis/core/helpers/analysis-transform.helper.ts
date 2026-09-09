import { Analysis } from '@prisma/client';
import { AnalysisEntity } from '../entities/analysis.entity';

export class AnalysisTransformHelper {
  static toEntity(analysis: Analysis): AnalysisEntity {
    return new AnalysisEntity(analysis);
  }

  static toEntities(analyses: Analysis[]): AnalysisEntity[] {
    return analyses.map((a) => this.toEntity(a));
  }
}
