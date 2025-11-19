import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly useS3: boolean;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.useS3 = this.configService.get('AWS_S3_BUCKET') !== undefined;

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<UploadResult> {
    if (this.useS3) {
      return this.uploadToS3(file, folder);
    }
    return this.uploadToLocal(file, folder);
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const folderPath = path.join(this.uploadDir, folder);
    const filePath = path.join(folderPath, uniqueFilename);

    // Ensure folder exists
    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Write file
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File uploaded to local storage: ${filePath}`);

    return {
      filename: uniqueFilename,
      url: `/uploads/${folder}/${uniqueFilename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  private async uploadToS3(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    // TODO: Implement S3 upload using AWS SDK
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const s3Key = `${folder}/${uniqueFilename}`;
    const bucket = this.configService.get('AWS_S3_BUCKET');

    this.logger.log(`[STUB] Would upload to S3: ${bucket}/${s3Key}`);

    // For now, fall back to local storage
    return this.uploadToLocal(file, folder);
  }

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

    return `${sanitizedName}_${timestamp}_${randomString}${ext}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    if (this.useS3) {
      return this.deleteFromS3(fileUrl);
    }
    return this.deleteFromLocal(fileUrl);
  }

  private async deleteFromLocal(fileUrl: string): Promise<boolean> {
    try {
      // Extract path from URL (remove /uploads prefix)
      const relativePath = fileUrl.replace(/^\/uploads\//, '');
      const filePath = path.join(this.uploadDir, relativePath);

      await fs.unlink(filePath);
      this.logger.log(`File deleted from local storage: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }

  private async deleteFromS3(fileUrl: string): Promise<boolean> {
    // TODO: Implement S3 deletion using AWS SDK
    this.logger.log(`[STUB] Would delete from S3: ${fileUrl}`);
    return true;
  }

  validateFile(
    file: Express.Multer.File,
    options: {
      maxSize?: number;
      allowedMimeTypes?: string[];
      allowedExtensions?: string[];
    } = {},
  ): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      };
    }

    // Check mime type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      };
    }

    // Check extension if specified
    if (options.allowedExtensions) {
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      if (!options.allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `File extension .${ext} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'general',
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }
}
