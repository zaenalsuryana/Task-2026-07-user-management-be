import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { LocationsService } from '../../locations.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import { ApiSuccessResponse, ApiSuccessArrayResponse } from '@common/decorators/api-response.decorator';
import 'multer';

@ApiTags('Locations')
@ApiCookieAuth('access_token')
@Controller({ path: 'locations', version: '1' })
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('layers')
  @ApiOperation({ summary: 'Get all available layers' })
  @ApiSuccessArrayResponse(Object)
  async getLayers() {
    return this.locationsService.getLayers();
  }

  @Get('layers/:id')
  @ApiOperation({ summary: 'Get all features data for a specific layer' })
  @ApiSuccessResponse(Object)
  async getLayerFeatures(@Param('id') id: string) {
    return this.locationsService.getLayerFeatures(id);
  }

  @Permissions(PERMISSIONS.LOCATION.ADD)
    @Post('upload')
  @ApiOperation({ summary: 'Upload GeoJSON or JSON file for locations' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        layerName: {
          type: 'string',
          description: 'Name of the layer (e.g., Retail, Real Estate). Defaults to filename.',
        },
        layerCategory: {
          type: 'string',
          description: 'Category of the layer (e.g., Landed House, Apartment).',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 1024 } }))
  @ApiSuccessResponse(Object)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('layerName') layerName?: string,
    @Body('layerCategory') layerCategory?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.geojson') && !file.originalname.endsWith('.json')) {
      throw new BadRequestException('Only GeoJSON or JSON files are allowed');
    }

    const finalLayerName = layerName || file.originalname.replace(/\.[^/.]+$/, "");

    return this.locationsService.importData(file.buffer, finalLayerName, layerCategory);
  }
}
