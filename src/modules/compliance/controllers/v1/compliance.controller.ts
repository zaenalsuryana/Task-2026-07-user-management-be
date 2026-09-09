import { Controller, Post, Get, Delete, Param, Body, UseInterceptors, UploadedFile, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiCookieAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ComplianceService } from '../../compliance.service';
import { AnalyzeComplianceDto, SaveComplianceDto, GetComplianceHistoryDto } from '../../core/dto/compliance-request.dto';
import { GetUser } from '@common/decorators/get-user.decorator';
import { JwtPayload } from '../../../auth/core/interfaces/jwt-payload.interface';
import { ApiSuccessResponse, ApiSuccessArrayResponse } from '@common/decorators/api-response.decorator';
import { ComplianceEntity } from '../../core/entities/compliance.entity';

@ApiTags('Compliance')
@ApiCookieAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a GeoJSON or ZIP (Shapefile) for compliance check' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
        },
      },
    },
  })
  @ApiSuccessResponse(Object)
  async uploadLocation(@UploadedFile() file: Express.Multer.File, @Body('name') name?: string) {
    return this.complianceService.uploadLocation(file, name);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze uploaded geometry against RDTR' })
  @ApiSuccessResponse(Object)
  async analyzeCompliance(@Body() dto: AnalyzeComplianceDto) {
    return this.complianceService.analyzeCompliance(dto.uploadId, dto.intendedUse);
  }

  @Post()
  @ApiOperation({ summary: 'Save compliance analysis result to history' })
  @ApiSuccessResponse(Object)
  async saveCompliance(
    @GetUser() user: JwtPayload, 
    @Body() data: SaveComplianceDto,
    @Req() req: Request
  ) {
    const result = await this.complianceService.saveCompliance(user.userId, data);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return { 
      id: result.id,
      api_url: `${baseUrl}/api/v1/compliance/history/${result.id}`
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'List compliance history (lightweight, without GeoJSON)' })
  @ApiSuccessArrayResponse(ComplianceEntity)
  async getHistory(@GetUser() user: JwtPayload, @Query() query: GetComplianceHistoryDto, @Req() req: Request) {
    const result = await this.complianceService.getHistory(user.userId, query);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    return result.map((item) => ({
      ...item,
      api_url: `${baseUrl}/api/v1/compliance/history/${item.id}`
    }));
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Get detailed compliance history' })
  @ApiSuccessResponse(ComplianceEntity)
  async getHistoryDetail(@GetUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    const result = await this.complianceService.getHistoryDetail(user.userId, id);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return {
      ...result,
      api_url: `${baseUrl}/api/v1/compliance/history/${result.id}`
    };
  }

  @Delete('history/:id')
  @ApiOperation({ summary: 'Delete compliance history' })
  @ApiSuccessResponse(Object)
  async deleteHistory(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.complianceService.deleteHistory(user.userId, id);
  }
}
