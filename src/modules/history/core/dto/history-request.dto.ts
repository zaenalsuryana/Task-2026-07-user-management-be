import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class GetHistoryDto {
  @ApiPropertyOptional({ description: 'Filter by title or location' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by layer name (e.g. ritel, f&b, real_estate)' })
  @IsOptional()
  @IsString()
  layerName?: string;

  @ApiPropertyOptional({ description: 'Sort by date (desc for newest, asc for oldest)' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';
}
