import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Compliance } from '@prisma/client';

export class ComplianceEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  intended_use: string;

  @ApiProperty()
  verdict: string;

  @ApiProperty()
  location: any;

  @ApiPropertyOptional()
  rdtr: any;

  @ApiPropertyOptional()
  zones: any;

  @ApiPropertyOptional()
  findings: any;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  constructor(partial: Partial<Compliance>) {
    this.id = partial.id;
    this.user_id = partial.user_id;
    this.intended_use = partial.intended_use;
    this.verdict = partial.verdict;
    this.rdtr = partial.rdtr;
    this.zones = partial.zones;
    this.findings = partial.findings;
    this.created_at = partial.created_at;
    this.updated_at = partial.updated_at;

    const centroidData: any = partial.centroid || {};
    this.location = {
      name: partial.name,
      area_m2: partial.area_m2,
      centroid: {
        lat: centroidData.lat,
        lng: centroidData.lng
      },
      geojson: centroidData.geojson
    };
  }
}
