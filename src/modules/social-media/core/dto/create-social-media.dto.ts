import { IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlatformType } from '@prisma/client';

export class CreateSocialMediaDto {
  @ApiProperty({ enum: PlatformType, example: PlatformType.INSTAGRAM })
  @IsNotEmpty()
  @IsEnum(PlatformType)
  platform: PlatformType;

  @ApiProperty({ example: 'https://instagram.com/username' })
  @IsNotEmpty()
  @IsUrl()
  url: string;
}