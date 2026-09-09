import { Module } from '@nestjs/common';
import { RdtrController } from './controllers/v1/rdtr.controller';

import { RdtrService } from './rdtr.service';

@Module({
  controllers: [RdtrController],
  providers: [RdtrService],
})
export class RdtrModule {}
