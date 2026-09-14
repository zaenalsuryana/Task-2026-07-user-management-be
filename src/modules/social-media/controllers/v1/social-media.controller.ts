import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { SocialMediaService } from '../../social-media.service';
import { CreateSocialMediaDto } from '../../core/dto/create-social-media.dto';
import { UpdateSocialMediaDto } from '../../core/dto/update-social-media.dto';

import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard'; 
import { GetUser } from '../../../../common/decorators/get-user.decorator'; 

@ApiTags('Social Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-media')
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @Post()
  @ApiOperation({ summary: 'Menambahkan link sosial media baru' })
  create(
    @GetUser('userId') userId: string, 
    @Body() dto: CreateSocialMediaDto
  ) {
    return this.socialMediaService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil semua sosial media milik user' })
  findAll(@GetUser('userId') userId: string) { 
    return this.socialMediaService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail satu sosial media' })
  findOne(
    @Param('id') id: string,
    @GetUser('userId') userId: string, 
  ) {
    return this.socialMediaService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Memperbarui data sosial media' })
  update(
    @Param('id') id: string,
    @GetUser('userId') userId: string, 
    @Body() dto: UpdateSocialMediaDto,
  ) {
    return this.socialMediaService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus sosial media' })
  remove(
    @Param('id') id: string,
    @GetUser('userId') userId: string, 
  ) {
    return this.socialMediaService.remove(id, userId);
  }
}