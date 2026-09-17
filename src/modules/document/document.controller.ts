import { Controller, Post, Delete, Param, ParseIntPipe, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { multerOptions } from '../../common/utils/file-upload.util';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // Sesuaikan path jika berbeda
import { GetUser } from '../../common/decorators/get-user.decorator'; // Sesuaikan path jika berbeda

@ApiTags('Documents')
@Controller({ path: 'documents', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Unggah dokumen baru ke Cloudflare R2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File dokumen (PDF/Image, Maks 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadDocument(
    @GetUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan atau format tidak sesuai');
    }
    const userId = user.id || user.userId; 
    return this.documentService.uploadDocument(userId, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus dokumen berdasarkan ID' })
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    const userId = user.id || user.userId;
    return this.documentService.deleteDocument(id, userId);
  }
}