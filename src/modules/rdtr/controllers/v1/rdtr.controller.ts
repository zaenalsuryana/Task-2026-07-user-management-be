import { Controller, Get, Query, Post, Param, UseInterceptors, UploadedFile, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { RdtrService } from '../../rdtr.service';

import { Public } from '@common/decorators/public.decorator';
import { ApiSuccessResponse } from '@common/decorators/api-response.decorator';

@ApiTags('RDTR')
@Public()
@Controller('rdtr')
export class RdtrController {
  constructor(private readonly rdtrService: RdtrService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Get RDTR zones as GeoJSON FeatureCollection (bbox required)' })
  @ApiQuery({ name: 'minLat', required: true, type: Number, description: 'Bounding box minimum latitude' })
  @ApiQuery({ name: 'maxLat', required: true, type: Number, description: 'Bounding box maximum latitude' })
  @ApiQuery({ name: 'minLng', required: true, type: Number, description: 'Bounding box minimum longitude' })
  @ApiQuery({ name: 'maxLng', required: true, type: Number, description: 'Bounding box maximum longitude' })
  @ApiSuccessResponse(Object)
  async getZones(
    @Query('minLat') minLat?: number,
    @Query('maxLat') maxLat?: number,
    @Query('minLng') minLng?: number,
    @Query('maxLng') maxLng?: number,
  ) {
    if (minLat === undefined || maxLat === undefined || minLng === undefined || maxLng === undefined) {
      throw new BadRequestException('Parameter bbox wajib: minLat, maxLat, minLng, maxLng');
    }
    return this.rdtrService.getZones(minLat, maxLat, minLng, maxLng);
  }

  @Get('zones/legend')
  @ApiOperation({ summary: 'Get RDTR legend' })
  @ApiSuccessResponse(Object)
  async getLegend() {
    return this.rdtrService.getLegend();
  }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Get a single RDTR zone by feature ID' })
  @ApiSuccessResponse(Object)
  async getZoneById(@Param('id') id: string) {
    const zone = await this.rdtrService.getZoneById(id);
    if (!zone) {
      throw new NotFoundException('Data RDTR tidak ditemukan');
    }
    return zone;
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload an RDTR GeoJSON/JSON file for background processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The RDTR file (.json, .geojson, or .zip) (max 10GB)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/rdtr';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10 GB limit
      },
    }),
  )
  async uploadRdtr(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'File is required' };
    }

    // Fire and forget: process in background
    this.rdtrService.processRdtrFile(file.path, file.originalname);

    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Upload received, processing started in the background.',
    };
  }
}
