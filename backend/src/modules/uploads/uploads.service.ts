import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly useCloudinary: boolean;

  constructor(private configService: ConfigService) {
    const cloudinaryConfig = this.configService.get('app.cloudinary');
    this.useCloudinary = !!(cloudinaryConfig?.cloudName && cloudinaryConfig?.apiKey && cloudinaryConfig?.apiSecret);
    
    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
      });
    } else {
      // Fallback: Create uploads directory if Cloudinary is not configured
      const uploadPath = path.join(process.cwd(), 'uploads', 'wastage');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
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

    if (this.useCloudinary) {
      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'toshacity/wastage',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              reject(new BadRequestException(`Cloudinary upload failed: ${error.message}`));
            } else if (!result || !result.secure_url) {
              reject(new BadRequestException('Cloudinary upload failed: No URL returned'));
            } else {
              // Store the Cloudinary URL in database
              resolve(result.secure_url);
            }
          },
        );
        uploadStream.end(file.buffer);
      });
    } else {
      // Fallback to local storage
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
      const filePath = path.join(process.cwd(), 'uploads', 'wastage', uniqueFilename);
      fs.writeFileSync(filePath, file.buffer);
      return `uploads/wastage/${uniqueFilename}`;
    }
  }

  getFileStream(filename: string): fs.ReadStream | string {
    // If it's a Cloudinary URL, return the URL directly
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    
    // Fallback to local file
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    return fs.createReadStream(filePath);
  }

  async deleteFile(filename: string): Promise<void> {
    // If it's a Cloudinary URL, extract public_id and delete from Cloudinary
    if (this.useCloudinary && (filename.startsWith('http://') || filename.startsWith('https://'))) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = filename.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const publicId = `toshacity/wastage/${filenameWithExt.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Continue even if deletion fails
      }
    } else {
      // Fallback to local file deletion
      const filePath = path.join(process.cwd(), filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

