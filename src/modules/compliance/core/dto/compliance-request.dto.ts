import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  area_m2: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  centroid: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  geojson?: any;
}

export class ZoneRuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kdb_max?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  klb_max?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kdh_min?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  gsb_m?: number;
}

export class ZoneDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zone_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zone_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  overlap_percent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  rules?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region_name?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  geojson?: any;
}

export class FindingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  basis?: string | null;
}

export class AnalyzeComplianceDto {
  @ApiProperty({ description: 'The ID of the uploaded compliance geometry' })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({ description: 'The intended land use (e.g. residential, retail, etc)' })
  @IsString()
  @IsNotEmpty()
  intendedUse: string;
}

export class SaveComplianceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  verdict: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  intended_use: string;

  @ApiProperty()
  @IsObject()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty()
  @IsObject()
  rdtr: any;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneDto)
  zones: ZoneDto[];

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FindingDto)
  findings: FindingDto[];
}

export class GetComplianceHistoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort?: 'asc' | 'desc';
}
