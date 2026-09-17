import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

export const multerOptions = {
  storage: memoryStorage(),
  fileFilter: (req: any, file: any, cb: any) => {
    // Validasi format file: Hanya JPG, JPEG, PNG, dan PDF
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