import { extname } from 'path';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

// Pastikan folder uploads/documents tersedia
const uploadPath = './uploads/documents';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

export const multerOptions = {
  storage: diskStorage({
    destination: uploadPath,
    filename: (req, file, cb) => {
      // Generate nama file acak menggunakan UUID untuk menghindari duplikasi
      const uniqueSuffix = uuidv4();
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    // Hanya izinkan PDF dan Gambar
    if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Format file tidak didukung. Harap unggah PDF, JPG, JPEG, atau PNG.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Batas maksimal ukuran file: 5MB
  },
};