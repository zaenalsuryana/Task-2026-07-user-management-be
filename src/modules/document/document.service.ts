import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// Pastikan path PrismaService sesuai dengan struktur foldermu
import { PrismaService } from '../../common/prisma/prisma.service'; 
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async uploadDocument(userId: number, file: Express.Multer.File) {
    const document = await this.prisma.document.create({
      data: {
        user_id: userId,
        file_name: file.originalname,
        file_path: file.path,
        mime_type: file.mimetype,
        size: file.size,
      },
    });

    return {
      message: 'Dokumen berhasil diunggah',
      document,
    };
  }

  async deleteDocument(documentId: number, userId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan');
    }

    // Pastikan user hanya bisa menghapus dokumen miliknya sendiri
    if (document.user_id !== userId) {
      throw new ForbiddenException('Anda tidak berhak menghapus dokumen ini');
    }

    // Hapus file fisik dari server
    try {
      await fs.unlink(path.resolve(document.file_path));
    } catch (error) {
      console.error(`Gagal menghapus file fisik: ${document.file_path}`, error);
      // Tetap lanjutkan menghapus data dari DB meskipun file fisik mungkin hilang
    }

    // Hapus data dari database
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return {
      message: 'Dokumen berhasil dihapus',
    };
  }
}