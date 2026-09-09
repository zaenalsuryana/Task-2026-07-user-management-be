import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class AnalysisPreviewDto {
  @ApiProperty()
  @IsString()
  layerName: string;

  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  radiusM: number;
}

export class AnalysisTableDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  analysisId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  layerName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  radiusM?: number;
}

export class CreateAnalysisDto extends AnalysisPreviewDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;
}
