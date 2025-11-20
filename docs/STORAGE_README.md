# DeepRef File Storage System

## Overview

Complete AWS S3 file storage integration for KYC documents and selfie uploads with enterprise-grade security, encryption, and cost optimization.

## Features

### Core Functionality
- ✅ AWS S3 integration with SDK v3
- ✅ Local storage fallback for development
- ✅ File validation (type, size, magic numbers)
- ✅ AES-256-GCM client-side encryption for sensitive files
- ✅ Server-side encryption (SSE-S3)
- ✅ Presigned URLs for secure access
- ✅ File lifecycle management
- ✅ Error handling with exponential backoff retry
- ✅ Comprehensive file header validation (prevents spoofing)
- ✅ Blocked executable extensions

### Security Features
- ✅ Multi-layer file validation
- ✅ Magic number verification (JPEG, PNG, PDF, WebP)
- ✅ Client-side encryption for KYC documents
- ✅ Server-side encryption (SSE-S3) by default
- ✅ Presigned URLs with configurable expiration
- ✅ IAM least privilege policies
- ✅ Private S3 buckets (no public access)
- ✅ ClamAV antivirus integration (optional)
- ✅ Malware detection and quarantine
- ✅ Audit logging

### Storage Optimization
- ✅ Intelligent Tiering storage class
- ✅ Lifecycle policies for cost reduction
- ✅ Versioning support
- ✅ Cross-region replication
- ✅ S3 Bucket Keys for encryption cost reduction
- ✅ Compression support
- ✅ CloudFront CDN integration (optional)

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │
│  (NestJS)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│ Storage Service │─────▶│  ClamAV      │
└────────┬────────┘      │  (Optional)  │
         │               └──────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│  S3    │ │ Local  │
│ Bucket │ │ Storage│
└───┬────┘ └────────┘
    │
    ▼
┌─────────────────┐
│  S3 Backup      │
│  (Cross-Region) │
└─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd apps/api
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Configure Environment

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `.env`:
```bash
# For development (local storage)
UPLOAD_DIR=./uploads
FILE_ENCRYPTION_KEY=your-generated-key

# For production (S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=deepref-uploads-production
FILE_ENCRYPTION_KEY=your-generated-key
```

### 3. Set Up AWS S3 (Production Only)

See [AWS_S3_SETUP.md](./AWS_S3_SETUP.md) for detailed instructions.

Quick setup:
```bash
# Create bucket
aws s3 mb s3://deepref-uploads-production --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket deepref-uploads-production \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket deepref-uploads-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

### 4. Run Tests

```bash
# Unit tests (no AWS required)
npm test -- storage.service.spec.ts

# Integration tests (requires AWS credentials)
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx npm test -- storage.service.spec.ts
```

## Usage

### Upload File with Encryption

```typescript
import { StorageService } from './common/services/storage.service';

@Injectable()
export class YourService {
  constructor(private storageService: StorageService) {}

  async uploadKYCDocument(file: Express.Multer.File, userId: string) {
    const result = await this.storageService.uploadFile(
      file,
      'kyc/documents',
      {
        encrypt: true, // Enable client-side encryption
        storageClass: 'INTELLIGENT_TIERING',
        metadata: {
          userId,
          documentType: 'passport',
        },
        tags: {
          category: 'kyc',
          sensitive: 'true',
        },
      }
    );

    return result;
  }
}
```

### Generate Presigned URL

```typescript
async getSecureDownloadUrl(fileKey: string) {
  const url = await this.storageService.getPresignedUrl(fileKey, {
    expiresIn: 3600, // 1 hour
    contentDisposition: 'attachment; filename="document.pdf"',
  });

  return url;
}
```

### Delete File

```typescript
async deleteDocument(fileUrl: string) {
  const success = await this.storageService.deleteFile(fileUrl);
  return success;
}
```

### Validate File Before Upload

```typescript
async uploadWithValidation(file: Express.Multer.File) {
  // Validate file
  const validation = this.storageService.validateFile(file, {
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  });

  if (!validation.valid) {
    throw new BadRequestException(validation.error);
  }

  // Upload if valid
  return this.storageService.uploadFile(file, 'documents');
}
```

## API Reference

### StorageService

#### `uploadFile(file, folder, options)`

Upload a file to S3 or local storage.

**Parameters:**
- `file`: Express.Multer.File - The file to upload
- `folder`: string - Target folder/prefix (e.g., 'kyc/documents')
- `options`: S3UploadOptions (optional)
  - `encrypt`: boolean - Enable client-side encryption
  - `storageClass`: string - S3 storage class
  - `metadata`: Record<string, string> - Custom metadata
  - `tags`: Record<string, string> - Object tags

**Returns:** `Promise<UploadResult>`

**Example:**
```typescript
const result = await storageService.uploadFile(file, 'kyc/selfies', {
  encrypt: true,
  storageClass: 'STANDARD',
  metadata: { userId: '123' },
  tags: { type: 'selfie' },
});
```

#### `deleteFile(fileUrl)`

Delete a file from S3 or local storage.

**Parameters:**
- `fileUrl`: string - The file URL or key

**Returns:** `Promise<boolean>`

#### `getPresignedUrl(fileKey, options)`

Generate a presigned URL for secure file access.

**Parameters:**
- `fileKey`: string - S3 object key
- `options`: PresignedUrlOptions (optional)
  - `expiresIn`: number - Expiration time in seconds (default: 3600)
  - `contentType`: string - Content-Type header
  - `contentDisposition`: string - Content-Disposition header

**Returns:** `Promise<string>`

#### `validateFile(file, options)`

Validate file type, size, and security.

**Parameters:**
- `file`: Express.Multer.File
- `options`: FileValidationOptions (optional)
  - `maxSize`: number - Maximum file size in bytes
  - `minSize`: number - Minimum file size in bytes
  - `allowedMimeTypes`: string[] - Allowed MIME types
  - `allowedExtensions`: string[] - Allowed file extensions

**Returns:** `{ valid: boolean; error?: string }`

#### `uploadMultipleFiles(files, folder, options)`

Upload multiple files in parallel.

**Parameters:**
- `files`: Express.Multer.File[]
- `folder`: string
- `options`: S3UploadOptions (optional)

**Returns:** `Promise<UploadResult[]>`

#### `fileExists(fileKey)`

Check if a file exists in S3.

**Parameters:**
- `fileKey`: string

**Returns:** `Promise<boolean>`

#### `getFileMetadata(fileKey)`

Get file metadata from S3.

**Parameters:**
- `fileKey`: string

**Returns:** `Promise<Record<string, any> | null>`

#### `copyFile(sourceKey, destinationKey)`

Copy a file within S3.

**Parameters:**
- `sourceKey`: string
- `destinationKey`: string

**Returns:** `Promise<boolean>`

## File Structure

```
kyc/
├── documents/
│   ├── passport_1234567890_abc123.jpg
│   ├── drivers_license_1234567891_def456.jpg
│   └── national_id_1234567892_ghi789.jpg
└── selfies/
    └── selfie_1234567893_jkl012.jpg

temp/
└── processing_1234567894_mno345.jpg

thumbnails/
└── thumb_1234567895_pqr678.jpg
```

## Security Best Practices

### 1. Never Expose Credentials

```typescript
// ❌ Bad
const accessKey = 'AKIAIOSFODNN7EXAMPLE';

// ✅ Good
const accessKey = this.configService.get('AWS_ACCESS_KEY_ID');
```

### 2. Always Use Encryption for Sensitive Data

```typescript
// ✅ KYC documents
await storageService.uploadFile(file, 'kyc/documents', {
  encrypt: true, // Client-side encryption
});
```

### 3. Validate All Files

```typescript
// ✅ Validate before upload
const validation = storageService.validateFile(file);
if (!validation.valid) {
  throw new BadRequestException(validation.error);
}
```

### 4. Use Presigned URLs

```typescript
// ❌ Bad - public S3 URL
const url = `https://bucket.s3.amazonaws.com/${key}`;

// ✅ Good - presigned URL with expiration
const url = await storageService.getPresignedUrl(key, {
  expiresIn: 3600,
});
```

### 5. Implement Rate Limiting

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 uploads per minute
@Post('upload')
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Upload logic
}
```

## Performance Tips

### 1. Use Intelligent Tiering

Automatically optimizes storage costs based on access patterns.

```typescript
const result = await storageService.uploadFile(file, 'kyc', {
  storageClass: 'INTELLIGENT_TIERING',
});
```

### 2. Implement Caching

Cache presigned URLs to reduce S3 GET requests.

### 3. Use CloudFront for Frequently Accessed Files

Reduces S3 costs and improves performance.

### 4. Compress Large Files

```typescript
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const compressed = await gzipAsync(file.buffer);
```

### 5. Use Multipart Upload for Large Files (>5MB)

Automatically handled by the storage service.

## Cost Optimization

### Estimated Monthly Costs

**Scenario**: 10,000 KYC documents/month (2MB average)

```
Storage (Intelligent Tiering): $0.46/month
PUT requests: $0.05/month
GET requests: $0.004/month
Encryption (with Bucket Keys): $0.01/month
Total: ~$0.52/month
```

### Cost Reduction Tips

1. Use Intelligent Tiering storage class
2. Enable S3 Bucket Keys (reduces encryption costs by 99%)
3. Implement lifecycle policies
4. Use CloudFront for downloads
5. Compress files before upload
6. Clean up temporary files regularly

See [S3_COST_OPTIMIZATION.md](./S3_COST_OPTIMIZATION.md) for details.

## Troubleshooting

### Common Issues

#### 1. "Access Denied" Error

**Cause**: Incorrect IAM permissions

**Solution**: Verify IAM policy includes all required permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject",
    "s3:HeadObject"
  ],
  "Resource": "arn:aws:s3:::your-bucket/*"
}
```

#### 2. "Bucket Not Found"

**Cause**: Bucket name or region mismatch

**Solution**: Verify environment variables:
```bash
AWS_S3_BUCKET=deepref-uploads-production
AWS_REGION=us-east-1
```

#### 3. File Header Validation Fails

**Cause**: File type spoofing or corrupted file

**Solution**: Ensure file has correct magic numbers:
- JPEG: Starts with `FF D8 FF`
- PNG: Starts with `89 50 4E 47`
- PDF: Starts with `25 50 44 46` (%PDF)

#### 4. Encryption Key Error

**Cause**: Missing or invalid encryption key

**Solution**: Generate and set encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env: FILE_ENCRYPTION_KEY=...
```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run start:dev
```

## Documentation

- [AWS S3 Setup Guide](./AWS_S3_SETUP.md) - Complete S3 configuration
- [Cost Optimization](./S3_COST_OPTIMIZATION.md) - Cost reduction strategies
- [Security & Antivirus](./FILE_SECURITY_AND_ANTIVIRUS.md) - Security best practices
- [Implementation Checklist](./S3_IMPLEMENTATION_CHECKLIST.md) - Step-by-step guide

## Testing

Run tests:
```bash
# Unit tests (no AWS required)
npm test -- storage.service.spec.ts

# Integration tests (requires AWS credentials)
AWS_ACCESS_KEY_ID=xxx \
AWS_SECRET_ACCESS_KEY=xxx \
AWS_S3_BUCKET=test-bucket \
npm test -- storage.service.spec.ts
```

Test coverage:
```bash
npm run test:cov -- storage.service.spec.ts
```

## Deployment

### Development
```bash
# Uses local storage
UPLOAD_DIR=./uploads npm run start:dev
```

### Staging
```bash
# Uses S3 with staging bucket
AWS_S3_BUCKET=deepref-uploads-staging npm run start
```

### Production
```bash
# Uses S3 with production bucket
AWS_S3_BUCKET=deepref-uploads-production npm run start:prod
```

## Monitoring

### CloudWatch Metrics
- S3 bucket size
- Request count (PUT, GET, DELETE)
- Error rate
- Storage cost

### Application Metrics
- Upload success rate
- Average upload time
- File validation failures
- Antivirus detection rate (if enabled)

### Alerts
- Storage cost > $100/month
- Error rate > 1%
- Upload failures > 10/hour

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
3. Check application logs
4. Contact DevOps team

## License

MIT License - See LICENSE file for details

## Contributors

- Backend Team
- DevOps Team
- Security Team

## Changelog

### v1.0.0 (2025-01-20)
- ✅ Initial AWS S3 integration
- ✅ Client-side encryption (AES-256-GCM)
- ✅ File validation with magic number verification
- ✅ Presigned URL support
- ✅ Local storage fallback
- ✅ Comprehensive test coverage
- ✅ Documentation complete
