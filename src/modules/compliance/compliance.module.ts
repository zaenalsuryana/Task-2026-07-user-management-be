import { Module } from '@nestjs/common';
import { ComplianceController } from './controllers/v1/compliance.controller';

import { ComplianceService } from './compliance.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
