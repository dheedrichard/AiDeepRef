import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        UPLOAD_DIR: './test-uploads',
        AWS_S3_BUCKET: '', // Empty for local testing
        AWS_REGION: 'us-east-1',
        FILE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should validate a valid JPEG file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should validate a valid PNG file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 1024 * 1024,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG header
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should reject file exceeding max size', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile, {
        maxSize: 10 * 1024 * 1024, // 10MB limit
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject file with invalid mime type', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test content'),
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject file with blocked extension', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'malicious.exe',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('MZ'), // EXE header
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('blocked for security reasons');
    });

    it('should reject file with spoofed mime type', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'fake.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('not a real jpeg'), // Wrong header
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match the declared file type');
    });

    it('should reject empty file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'empty.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 50, // Too small
        buffer: Buffer.from([]),
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.validateFile(mockFile, {
        minSize: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small or empty');
    });
  });

  describe('File Upload - Local Storage', () => {
    it('should upload file to local storage', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
        destination: '',
        filename: '',
        path: '',
      };

      const result = await service.uploadFile(mockFile, 'test');

      expect(result).toBeDefined();
      expect(result.filename).toContain('test_');
      expect(result.url).toContain('/uploads/test/');
      expect(result.size).toBe(1024);
      expect(result.mimetype).toBe('image/jpeg');

      // Cleanup
      await service.deleteFile(result.url);
    });

    it('should upload multiple files', async () => {
      const files: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
          destination: '',
          filename: '',
          path: '',
        },
        {
          fieldname: 'files',
          originalname: 'test2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(2044).fill(0)]),
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const results = await service.uploadMultipleFiles(files, 'test');

      expect(results).toHaveLength(2);
      expect(results[0].filename).toContain('test1_');
      expect(results[1].filename).toContain('test2_');

      // Cleanup
      await Promise.all(results.map((r) => service.deleteFile(r.url)));
    });

    it('should throw error for invalid file', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('MZ'),
        destination: '',
        filename: '',
        path: '',
      };

      await expect(service.uploadFile(mockFile, 'test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('File Deletion', () => {
    it('should delete file from local storage', async () => {
      // First upload a file
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'delete-test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
        destination: '',
        filename: '',
        path: '',
      };

      const uploadResult = await service.uploadFile(mockFile, 'test');

      // Then delete it
      const deleteResult = await service.deleteFile(uploadResult.url);
      expect(deleteResult).toBe(true);
    });

    it('should handle deletion of non-existent file', async () => {
      const result = await service.deleteFile('/uploads/test/non-existent.jpg');
      expect(result).toBe(false);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt file correctly', () => {
      const originalData = Buffer.from('sensitive KYC document data');

      // Access private method via type assertion for testing
      const encrypted = (service as any).encryptFile(originalData);
      expect(encrypted).not.toEqual(originalData);
      expect(encrypted.length).toBeGreaterThan(originalData.length); // IV + AuthTag + Data

      const decrypted = service.decryptFile(encrypted);
      expect(decrypted).toEqual(originalData);
    });

    it('should use different IV for each encryption', () => {
      const data = Buffer.from('test data');

      const encrypted1 = (service as any).encryptFile(data);
      const encrypted2 = (service as any).encryptFile(data);

      // IVs should be different (first 16 bytes)
      expect(encrypted1.slice(0, 16)).not.toEqual(encrypted2.slice(0, 16));
    });
  });

  describe('Filename Generation', () => {
    it('should generate unique filenames', () => {
      const filename1 = (service as any).generateUniqueFilename('test.jpg');
      const filename2 = (service as any).generateUniqueFilename('test.jpg');

      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/test_\d+_[a-f0-9]+\.jpg/);
      expect(filename2).toMatch(/test_\d+_[a-f0-9]+\.jpg/);
    });

    it('should sanitize filename', () => {
      const filename = (service as any).generateUniqueFilename(
        'test file with spaces & special!chars.jpg',
      );

      expect(filename).toMatch(/test_file_with_spaces___special_chars_\d+_[a-f0-9]+\.jpg/);
    });

    it('should preserve file extension', () => {
      const pdfFilename = (service as any).generateUniqueFilename('document.pdf');
      const jpgFilename = (service as any).generateUniqueFilename('image.jpg');

      expect(pdfFilename).toMatch(/\.pdf$/);
      expect(jpgFilename).toMatch(/\.jpg$/);
    });
  });

  describe('Storage Configuration', () => {
    it('should return storage configuration', () => {
      const config = service.getStorageConfig();

      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('bucket');
      expect(config).toHaveProperty('region');
      expect(config).toHaveProperty('encryptionEnabled');
      expect(config).toHaveProperty('localPath');
    });

    it('should indicate local storage when S3 not configured', () => {
      const config = service.getStorageConfig();
      expect(config.provider).toBe('local');
    });
  });
});

// S3 Integration Tests (requires AWS credentials)
describe('StorageService - S3 Integration', () => {
  let service: StorageService;

  const mockS3ConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        UPLOAD_DIR: './test-uploads',
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'test-bucket',
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        FILE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockS3ConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  // Skip these tests if AWS credentials are not configured
  const skipIfNoAWS = process.env.AWS_ACCESS_KEY_ID ? it : it.skip;

  skipIfNoAWS('should upload file to S3', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 's3-test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadFile(mockFile, 'test', {
      encrypt: true,
      storageClass: 'STANDARD',
    });

    expect(result).toBeDefined();
    expect(result.url).toContain('s3.amazonaws.com');
    expect(result.key).toContain('test/');
    expect(result.bucket).toBeDefined();
    expect(result.etag).toBeDefined();

    // Cleanup
    if (result.url) {
      await service.deleteFile(result.url);
    }
  });

  skipIfNoAWS('should generate presigned URL', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'presigned-test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
      destination: '',
      filename: '',
      path: '',
    };

    const uploadResult = await service.uploadFile(mockFile, 'test');
    const presignedUrl = await service.getPresignedUrl(uploadResult.key!, {
      expiresIn: 3600,
    });

    expect(presignedUrl).toBeDefined();
    expect(presignedUrl).toContain('X-Amz-Algorithm');
    expect(presignedUrl).toContain('X-Amz-Signature');

    // Cleanup
    await service.deleteFile(uploadResult.url);
  });

  skipIfNoAWS('should check if file exists', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'exists-test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
      destination: '',
      filename: '',
      path: '',
    };

    const uploadResult = await service.uploadFile(mockFile, 'test');
    const exists = await service.fileExists(uploadResult.key!);

    expect(exists).toBe(true);

    // Cleanup
    await service.deleteFile(uploadResult.url);

    // Check again after deletion
    const existsAfterDelete = await service.fileExists(uploadResult.key!);
    expect(existsAfterDelete).toBe(false);
  });

  skipIfNoAWS('should get file metadata', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'metadata-test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(1020).fill(0)]),
      destination: '',
      filename: '',
      path: '',
    };

    const uploadResult = await service.uploadFile(mockFile, 'test', {
      metadata: {
        userId: 'test-user-123',
        documentType: 'passport',
      },
    });

    const metadata = await service.getFileMetadata(uploadResult.key!);

    expect(metadata).toBeDefined();
    expect(metadata!.contentType).toBe('image/jpeg');
    expect(metadata!.contentLength).toBe(1024);
    expect(metadata!.metadata).toHaveProperty('originalName');

    // Cleanup
    await service.deleteFile(uploadResult.url);
  });
});
