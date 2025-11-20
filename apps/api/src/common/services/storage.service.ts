import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  key?: string; // S3 object key
  bucket?: string; // S3 bucket name
  etag?: string; // S3 ETag for verification
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  minSize?: number;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  contentType?: string;
  contentDisposition?: string;
}

interface S3UploadOptions {
  encrypt?: boolean;
  storageClass?: 'STANDARD' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly useS3: boolean;
  private s3Client: S3Client | null = null;
  private readonly s3Bucket: string;
  private readonly s3Region: string;
  private readonly encryptionKey: Buffer | null = null;

  // File validation constants
  private readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly KYC_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB for KYC documents
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  private readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  // Malicious file patterns to block
  private readonly BLOCKED_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'rpm', 'dmg', 'pkg', 'sh', 'bash', 'ps1',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.s3Bucket = this.configService.get('AWS_S3_BUCKET', '');
    this.s3Region = this.configService.get('AWS_REGION', 'us-east-1');
    this.useS3 = !!this.s3Bucket;

    // Initialize encryption key for sensitive files
    const encryptionKeyHex = this.configService.get('FILE_ENCRYPTION_KEY');
    if (encryptionKeyHex) {
      this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
    }

    // Initialize S3 client if configured
    if (this.useS3) {
      this.initializeS3Client();
    } else {
      this.logger.warn('S3 not configured. Using local storage. Not recommended for production.');
      this.ensureUploadDir();
    }
  }

  private initializeS3Client(): void {
    try {
      const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials not configured');
      }

      this.s3Client = new S3Client({
        region: this.s3Region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // Add retry configuration
        maxAttempts: 3,
        // Add request timeout
        requestHandler: {
          requestTimeout: 30000, // 30 seconds
        } as any,
      });

      this.logger.log(`S3 client initialized for bucket: ${this.s3Bucket} in region: ${this.s3Region}`);
    } catch (error) {
      this.logger.error(`Failed to initialize S3 client: ${error.message}`);
      this.useS3 = false;
      this.ensureUploadDir();
    }
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Upload a file to S3 or local storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
    options: S3UploadOptions = {},
  ): Promise<UploadResult> {
    // Validate file before upload
    const validation = this.validateFile(file, {
      maxSize: folder.includes('kyc') ? this.KYC_MAX_FILE_SIZE : this.DEFAULT_MAX_FILE_SIZE,
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    if (this.useS3 && this.s3Client) {
      return this.uploadToS3(file, folder, options);
    }
    return this.uploadToLocal(file, folder);
  }

  /**
   * Upload to AWS S3 with encryption and retry logic
   */
  private async uploadToS3(
    file: Express.Multer.File,
    folder: string,
    options: S3UploadOptions = {},
  ): Promise<UploadResult> {
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const s3Key = `${folder}/${uniqueFilename}`;

    let fileBuffer = file.buffer;

    // Encrypt sensitive files (KYC documents)
    if (options.encrypt && this.encryptionKey) {
      fileBuffer = this.encryptFile(fileBuffer);
      this.logger.log(`File encrypted: ${s3Key}`);
    }

    const uploadParams: any = {
      Bucket: this.s3Bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: file.mimetype,
      // Enable server-side encryption by default
      ServerSideEncryption: 'AES256',
      // Set storage class
      StorageClass: options.storageClass || 'INTELLIGENT_TIERING',
      // Add metadata
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        ...options.metadata,
      },
      // Add tags for cost tracking and lifecycle management
      Tagging: this.buildTagString({
        folder,
        contentType: file.mimetype,
        encrypted: options.encrypt ? 'true' : 'false',
        ...options.tags,
      }),
    };

    try {
      const command = new PutObjectCommand(uploadParams);
      const response = await this.s3Client!.send(command);

      this.logger.log(`File uploaded to S3: ${this.s3Bucket}/${s3Key}`);

      return {
        filename: uniqueFilename,
        url: `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${s3Key}`,
        size: file.size,
        mimetype: file.mimetype,
        key: s3Key,
        bucket: this.s3Bucket,
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error(`S3 upload failed: ${error.message}`, error.stack);

      // Retry logic with exponential backoff
      return this.retryUpload(file, folder, options, 3);
    }
  }

  /**
   * Retry upload with exponential backoff
   */
  private async retryUpload(
    file: Express.Multer.File,
    folder: string,
    options: S3UploadOptions,
    retriesLeft: number,
    delayMs: number = 1000,
  ): Promise<UploadResult> {
    if (retriesLeft === 0) {
      this.logger.error('Max retries reached. Falling back to local storage.');
      return this.uploadToLocal(file, folder);
    }

    await this.delay(delayMs);

    try {
      return await this.uploadToS3(file, folder, options);
    } catch (error) {
      this.logger.warn(`Retry failed. Retries left: ${retriesLeft - 1}`);
      return this.retryUpload(file, folder, options, retriesLeft - 1, delayMs * 2);
    }
  }

  /**
   * Upload to local filesystem (development only)
   */
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

  /**
   * Generate a presigned URL for secure file access
   */
  async getPresignedUrl(
    fileKey: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    if (!this.useS3 || !this.s3Client) {
      throw new Error('S3 not configured. Cannot generate presigned URL.');
    }

    const command = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: fileKey,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: options.contentDisposition,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      this.logger.log(`Generated presigned URL for: ${fileKey}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from S3 or local storage
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    if (this.useS3 && this.s3Client) {
      return this.deleteFromS3(fileUrl);
    }
    return this.deleteFromLocal(fileUrl);
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(fileUrl: string): Promise<boolean> {
    try {
      // Extract S3 key from URL
      const s3Key = this.extractS3KeyFromUrl(fileUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: s3Key,
      });

      await this.s3Client!.send(command);
      this.logger.log(`File deleted from S3: ${s3Key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete from local storage
   */
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

  /**
   * Validate file type, size, and security
   */
  validateFile(
    file: Express.Multer.File,
    options: FileValidationOptions = {},
  ): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || this.DEFAULT_MAX_FILE_SIZE;
    const minSize = options.minSize || 100; // 100 bytes minimum
    const allowedMimeTypes = options.allowedMimeTypes || this.ALLOWED_DOCUMENT_TYPES;

    // Check if file exists
    if (!file || !file.buffer) {
      return { valid: false, error: 'No file provided' };
    }

    // Check minimum size (prevent empty files)
    if (file.size < minSize) {
      return { valid: false, error: 'File is too small or empty' };
    }

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

    // Check for blocked extensions (security)
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (this.BLOCKED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `File extension .${ext} is blocked for security reasons`,
      };
    }

    // Validate file header (magic numbers) to prevent mime type spoofing
    const headerValidation = this.validateFileHeader(file.buffer, file.mimetype);
    if (!headerValidation.valid) {
      return headerValidation;
    }

    return { valid: true };
  }

  /**
   * Validate file header (magic numbers) to prevent mime type spoofing
   */
  private validateFileHeader(
    buffer: Buffer,
    expectedMimeType: string,
  ): { valid: boolean; error?: string } {
    const header = buffer.slice(0, 12).toString('hex');

    const mimeSignatures: Record<string, string[]> = {
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
      'image/png': ['89504e47'],
      'image/webp': ['52494646'], // RIFF
      'application/pdf': ['25504446'], // %PDF
    };

    const expectedSignatures = mimeSignatures[expectedMimeType];
    if (!expectedSignatures) {
      // If we don't have signature validation, allow it
      return { valid: true };
    }

    const isValid = expectedSignatures.some(sig => header.startsWith(sig));
    if (!isValid) {
      return {
        valid: false,
        error: 'File header does not match the declared file type. Possible file type spoofing.',
      };
    }

    return { valid: true };
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'general',
    options: S3UploadOptions = {},
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(fileKey: string): Promise<boolean> {
    if (!this.useS3 || !this.s3Client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy a file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    if (!this.useS3 || !this.s3Client) {
      throw new Error('S3 not configured');
    }

    try {
      const command = new CopyObjectCommand({
        Bucket: this.s3Bucket,
        CopySource: `${this.s3Bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`File copied from ${sourceKey} to ${destinationKey}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`);
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(fileKey: string): Promise<Record<string, any> | null> {
    if (!this.useS3 || !this.s3Client) {
      return null;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Encrypt file buffer using AES-256-GCM
   */
  private encryptFile(buffer: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: IV + AuthTag + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt file buffer using AES-256-GCM
   */
  decryptFile(buffer: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Generate a unique filename with timestamp and random string
   */
  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

    return `${sanitizedName}_${timestamp}_${randomString}${ext}`;
  }

  /**
   * Extract S3 key from URL
   */
  private extractS3KeyFromUrl(url: string): string {
    // Handle both formats:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading slash
    return pathname.substring(1);
  }

  /**
   * Build tag string for S3 objects
   */
  private buildTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get storage statistics
   */
  getStorageConfig(): Record<string, any> {
    return {
      provider: this.useS3 ? 's3' : 'local',
      bucket: this.s3Bucket,
      region: this.s3Region,
      encryptionEnabled: !!this.encryptionKey,
      localPath: this.uploadDir,
    };
  }
}
