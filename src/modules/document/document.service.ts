import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class DocumentService {
  private s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
  private bucketName = process.env.R2_BUCKET_NAME;

  constructor(private prisma: PrismaService) {}

  async uploadDocument(userId: number, file: Express.Multer.File) {
    const fileExt = extname(file.originalname);
    const fileName = `documents/${uuidv4()}${fileExt}`;

    const uploadParams = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Kirim file ke Cloudflare R2
    await this.s3Client.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;

    // Simpan metadata ke database
    const document = await this.prisma.document.create({
      data: {
        user_id: userId,
        file_name: file.originalname,
        file_path: fileUrl,
        mime_type: file.mimetype,
        size: file.size,
      },
    });

    return {
      message: 'Dokumen berhasil diunggah ke Cloudflare R2',
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

    if (document.user_id !== userId) {
      throw new ForbiddenException('Anda tidak berhak menghapus dokumen ini');
    }

    // Ekstrak S3 Key dari URL file_path
    const urlParts = document.file_path.split('.r2.cloudflarestorage.com/');
    if (urlParts.length > 1) {
      const s3Key = urlParts[1];
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
          }),
        );
      } catch (error) {
        console.error(`Gagal menghapus file dari R2: ${s3Key}`, error);
      }
    }

    // Hapus data dari database
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return {
      message: 'Dokumen berhasil dihapus dari database dan Cloudflare R2',
    };
  }
}