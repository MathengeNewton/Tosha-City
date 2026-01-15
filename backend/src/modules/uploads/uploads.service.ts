import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private readonly uploadPath: string;

  constructor(private configService: ConfigService) {
    // Create uploads directory if it doesn't exist
    this.uploadPath = path.join(process.cwd(), 'uploads', 'wastage');
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG and PNG images are allowed');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, uniqueFilename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative path for database storage
    return `uploads/wastage/${uniqueFilename}`;
  }

  getFileStream(filename: string): fs.ReadStream {
    const filePath = path.join(process.cwd(), filename);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    return fs.createReadStream(filePath);
  }

  deleteFile(filename: string): void {
    const filePath = path.join(process.cwd(), filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

