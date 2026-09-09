import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Analysis } from '@prisma/client';

export class AnalysisEntity implements Analysis {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: number;

  @ApiPropertyOptional()
  title: string | null;

  @ApiProperty()
  layer_id: string;

  @ApiPropertyOptional()
  layer?: { name: string };

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  radius_m: number;

  @ApiProperty()
  total_competitors: number;

  @ApiPropertyOptional()
  competitors: any;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  constructor(partial: Partial<AnalysisEntity>) {
    Object.assign(this, partial);
  }
}
