import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { HistoryService } from '../../history.service';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { GetHistoryDto } from '../../core/dto/history-request.dto';
import { GetUser } from '@common/decorators/get-user.decorator';
import {
  ApiSuccessResponse,
  ApiSuccessArrayResponse,
} from '@common/decorators/api-response.decorator';
import { JwtPayload } from '../../../auth/core/interfaces/jwt-payload.interface';
import { AnalysisEntity } from '../../../analysis/core/entities/analysis.entity';

@ApiTags('History')
@ApiCookieAuth('access_token')
@Controller({ path: 'history', version: '1' })
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get saved analyses for current user' })
  @ApiSuccessArrayResponse(AnalysisEntity)
  async getSavedAnalysis(@GetUser() user: JwtPayload, @Query() query: GetHistoryDto) {
    return this.historyService.findAll(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific saved analysis detail' })
  @ApiSuccessResponse(AnalysisEntity)
  async getHistoryById(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.historyService.findOne(id, user.userId);
  }

  @Get(':id/table')
  @ApiOperation({ summary: 'Get detailed table data for a saved analysis' })
  @ApiSuccessArrayResponse(Object)
  async getHistoryTable(@Param('id') id: string) {
    return this.historyService.getTable(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved analysis from history' })
  @ApiSuccessResponse(Object)
  async deleteHistory(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.historyService.delete(id, user.userId);
  }
}
