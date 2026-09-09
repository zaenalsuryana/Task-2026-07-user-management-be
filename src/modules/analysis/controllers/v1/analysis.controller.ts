import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AnalysisService } from '../../analysis.service';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import {
  AnalysisPreviewDto,
  AnalysisTableDto,
  CreateAnalysisDto,
} from '../../core/dto/analysis-request.dto';
import { GetUser } from '@common/decorators/get-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import {
  ApiSuccessResponse,
  ApiSuccessArrayResponse,
} from '@common/decorators/api-response.decorator';
import { JwtPayload } from '../../../auth/core/interfaces/jwt-payload.interface';
import { AnalysisEntity } from '../../core/entities/analysis.entity';

@ApiTags('Analysis')
@ApiCookieAuth('access_token')
@Controller({ path: 'analysis', version: '1' })
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

    @Post('preview')
  @ApiOperation({ summary: 'Preview spatial analysis results for map' })
  @ApiSuccessArrayResponse(Object)
  async preview(@Body() dto: AnalysisPreviewDto) {
    return this.analysisService.preview(dto);
  }

    @Post('table')
  @ApiOperation({ summary: 'Get detailed table data for basic analysis' })
  @ApiSuccessArrayResponse(Object)
  async getTable(@Body() dto: AnalysisPreviewDto) {
    return this.analysisService.getTableFromPreview(dto);
  }

    @Post()
  @ApiOperation({ summary: 'Save an analysis' })
  @ApiSuccessResponse(AnalysisEntity)
  async saveAnalysis(@GetUser() user: JwtPayload, @Body() dto: CreateAnalysisDto) {
    return this.analysisService.create(user.userId, dto);
  }
}
