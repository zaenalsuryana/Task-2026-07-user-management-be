import { Module } from '@nestjs/common';
import { SocialMediaService } from './social-media.service';
import { SocialMediaController } from './controllers/v1/social-media.controller';
import { PrismaModule } from '@common/prisma/prisma.module'; // Sesuaikan jika path aliasnya berbeda

@Module({
  imports: [PrismaModule],
  controllers: [SocialMediaController],
  providers: [SocialMediaService],
  exports: [SocialMediaService], // Opsional: Tambahkan jika service ini akan dipakai di modul lain ke depannya
})
export class SocialMediaModule {}