import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateSocialMediaDto } from './core/dto/create-social-media.dto';
import { UpdateSocialMediaDto } from './core/dto/update-social-media.dto';

@Injectable( )
export class SocialMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSocialMediaDto) {
    return this.prisma.socialMedia.create({
      data: {
        ...dto,
        userId: Number(userId),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.socialMedia.findMany({
      where: { userId: Number(userId) },
    });
  }

  async findOne(id: string, userId: string) {
    const socialMedia = await this.prisma.socialMedia.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!socialMedia) {
      throw new NotFoundException(`Social media with ID ${id} not found`);
    }

    return socialMedia;
  }

  async update(id: string, userId: string, dto: UpdateSocialMediaDto) {
    await this.findOne(id, userId); // Pastikan data ada dan milik user tersebut

    return this.prisma.socialMedia.update({
      where: { id: Number(id) },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Pastikan data ada dan milik user tersebut

    return this.prisma.socialMedia.delete({
      where: { id: Number(id) },
    });
  }
}