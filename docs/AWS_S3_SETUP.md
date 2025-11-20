# AWS S3 File Storage Setup Guide

## Overview

This guide provides step-by-step instructions for setting up AWS S3 file storage for the DeepRef application, specifically for KYC documents and selfie uploads.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [S3 Bucket Configuration](#s3-bucket-configuration)
4. [IAM User and Permissions](#iam-user-and-permissions)
5. [Environment Configuration](#environment-configuration)
6. [Security Features](#security-features)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed (optional but recommended)
- Node.js v18+ and npm installed
- Access to the DeepRef application environment variables

## AWS Account Setup

### Step 1: Create AWS Account

If you don't have an AWS account:
1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow the registration process
4. Set up billing alerts (recommended)

### Step 2: Set Up MFA (Multi-Factor Authentication)

For security, enable MFA on your root account:
1. Go to IAM Console → Security Credentials
2. Click "Assign MFA device"
3. Follow the setup wizard

## S3 Bucket Configuration

### Step 1: Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://deepref-uploads-production --region us-east-1

# Or manually via AWS Console:
# 1. Go to S3 Console
# 2. Click "Create bucket"
# 3. Enter bucket name: deepref-uploads-production
# 4. Select region: us-east-1 (or your preferred region)
# 5. Keep "Block all public access" ENABLED
```

**Important**: Replace `deepref-uploads-production` with your actual bucket name.

### Step 2: Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket deepref-uploads-production \
  --versioning-configuration Status=Enabled
```

Or via Console:
1. Go to bucket → Properties
2. Find "Bucket Versioning"
3. Click "Edit" → Enable → Save

### Step 3: Configure Server-Side Encryption

```bash
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

Or via Console:
1. Go to bucket → Properties
2. Find "Default encryption"
3. Click "Edit"
4. Select "Server-side encryption with Amazon S3 managed keys (SSE-S3)"
5. Enable bucket key (reduces costs)
6. Save

### Step 4: Configure CORS (if needed for direct browser uploads)

Create a file `cors-config.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://yourdomain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS configuration:

```bash
aws s3api put-bucket-cors \
  --bucket deepref-uploads-production \
  --cors-configuration file://cors-config.json
```

### Step 5: Configure Lifecycle Policies

Create a file `lifecycle-policy.json`:

```json
{
  "Rules": [
    {
      "Id": "KYC Documents Retention",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "kyc/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "Temporary Files Cleanup",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "Incomplete Multipart Upload Cleanup",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

Apply lifecycle policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket deepref-uploads-production \
  --lifecycle-configuration file://lifecycle-policy.json
```

### Step 6: Enable Access Logging (Optional but Recommended)

```bash
# Create logging bucket
aws s3 mb s3://deepref-uploads-logs --region us-east-1

# Enable logging
aws s3api put-bucket-logging \
  --bucket deepref-uploads-production \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "deepref-uploads-logs",
      "TargetPrefix": "s3-access-logs/"
    }
  }'
```

### Step 7: Configure Bucket Policy (Optional - for CloudFront)

If using CloudFront for content delivery:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::deepref-uploads-production/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## IAM User and Permissions

### Step 1: Create IAM User

```bash
# Create IAM user
aws iam create-user --user-name deepref-s3-uploader

# Or via Console:
# 1. Go to IAM Console → Users
# 2. Click "Add users"
# 3. Username: deepref-s3-uploader
# 4. Access type: Programmatic access
# 5. Click "Next"
```

### Step 2: Create IAM Policy

Create a file `s3-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::deepref-uploads-production"
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::deepref-uploads-production/*"
    },
    {
      "Sid": "GetObjectMetadata",
      "Effect": "Allow",
      "Action": [
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::deepref-uploads-production/*"
    }
  ]
}
```

Apply the policy:

```bash
# Create policy
aws iam create-policy \
  --policy-name DeepRefS3UploaderPolicy \
  --policy-document file://s3-policy.json

# Attach policy to user
aws iam attach-user-policy \
  --user-name deepref-s3-uploader \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/DeepRefS3UploaderPolicy
```

### Step 3: Create Access Keys

```bash
# Create access keys
aws iam create-access-key --user-name deepref-s3-uploader

# Output will contain:
# - AccessKeyId
# - SecretAccessKey

# IMPORTANT: Save these credentials securely!
# You won't be able to retrieve the secret key again.
```

**Security Best Practices**:
- Never commit access keys to version control
- Rotate access keys every 90 days
- Use AWS Secrets Manager or similar for production
- Enable MFA for sensitive operations

## Environment Configuration

### Step 1: Generate Encryption Key

Generate a 256-bit encryption key for file encryption:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=deepref-uploads-production

# File Storage Configuration
UPLOAD_DIR=./uploads
FILE_ENCRYPTION_KEY=your-generated-32-byte-hex-key-here

# File Upload Limits
MAX_FILE_SIZE=15728640
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf

# Storage Features
S3_ENABLE_VERSIONING=true
S3_ENABLE_ENCRYPTION=true
S3_STORAGE_CLASS=INTELLIGENT_TIERING
```

### Step 3: Production Configuration

For production, use AWS Secrets Manager or similar:

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name deepref/prod/aws-credentials \
  --secret-string '{
    "AWS_ACCESS_KEY_ID": "your-access-key",
    "AWS_SECRET_ACCESS_KEY": "your-secret-key",
    "FILE_ENCRYPTION_KEY": "your-encryption-key"
  }'
```

Update your application to fetch from Secrets Manager:

```typescript
// In your config service or startup
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const response = await client.send(
  new GetSecretValueCommand({ SecretId: 'deepref/prod/aws-credentials' })
);
const secrets = JSON.parse(response.SecretString);
```

## Security Features

### 1. Server-Side Encryption (SSE-S3)

All files are automatically encrypted at rest using AES-256 encryption.

### 2. Client-Side Encryption (Application Layer)

KYC documents are encrypted before upload using AES-256-GCM:
- Unique IV (Initialization Vector) per file
- Authentication tag for integrity verification
- Encryption key stored securely (never in S3)

### 3. Presigned URLs

For secure file access:
- Temporary URLs that expire after specified time (default: 1 hour)
- No need to make S3 bucket public
- Fine-grained access control

### 4. File Validation

- MIME type validation
- File size limits
- Magic number verification (prevents file type spoofing)
- Blocked executable extensions

### 5. Access Control

- IAM policies with least privilege principle
- Bucket policies to prevent unauthorized access
- Private bucket (no public access)

## Testing

### Step 1: Install Dependencies

```bash
cd apps/api
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Test Upload

```typescript
import { Test } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

describe('StorageService - S3 Integration', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StorageService, ConfigService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should upload file to S3', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake image data'),
    };

    const result = await service.uploadFile(mockFile, 'test', {
      encrypt: true,
    });

    expect(result).toBeDefined();
    expect(result.url).toContain('s3.amazonaws.com');
    expect(result.key).toBe('test/test_*.jpg');

    // Cleanup
    await service.deleteFile(result.url);
  });
});
```

### Step 3: Test Presigned URLs

```bash
# Using curl to test presigned URL
curl -I "$(node -e 'console.log(await storageService.getPresignedUrl("kyc/document.jpg"))')"
```

## Troubleshooting

### Common Issues

#### 1. Access Denied Errors

```
Error: Access Denied
```

**Solution**:
- Verify IAM policy is correctly attached
- Check bucket policy doesn't deny access
- Ensure AWS credentials are correct

#### 2. Bucket Not Found

```
Error: The specified bucket does not exist
```

**Solution**:
- Verify bucket name in environment variables
- Check bucket exists in the specified region
- Ensure no typos in bucket name

#### 3. CORS Errors (Browser Uploads)

```
Error: CORS policy blocks access
```

**Solution**:
- Update CORS configuration to include your domain
- Add necessary headers to CORS policy
- Clear browser cache

#### 4. Slow Upload Performance

**Solutions**:
- Use multipart upload for files > 5MB
- Enable Transfer Acceleration on bucket
- Use CloudFront for downloads
- Check network bandwidth

#### 5. Encryption Errors

```
Error: Encryption key not configured
```

**Solution**:
- Ensure FILE_ENCRYPTION_KEY is set in environment
- Verify key is 32 bytes (64 hex characters)
- Regenerate key if corrupted

### Debug Commands

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test bucket access
aws s3 ls s3://deepref-uploads-production

# Check bucket encryption
aws s3api get-bucket-encryption --bucket deepref-uploads-production

# View bucket policy
aws s3api get-bucket-policy --bucket deepref-uploads-production

# Test file upload
aws s3 cp test.jpg s3://deepref-uploads-production/test/
```

## Cost Estimation

### Storage Costs (us-east-1)

- S3 Standard: $0.023 per GB/month
- Intelligent Tiering: $0.0125 per GB/month (after optimization)
- Glacier: $0.004 per GB/month (for archives)

### Request Costs

- PUT/COPY/POST: $0.005 per 1,000 requests
- GET/SELECT: $0.0004 per 1,000 requests
- Lifecycle transitions: $0.01 per 1,000 requests

### Example Monthly Cost (1,000 users, 10 KYC docs each)

- Storage: 10,000 files × 2MB = 20GB
- Storage cost: 20GB × $0.023 = $0.46
- Upload requests: 10,000 × $0.005/1000 = $0.05
- Download requests (presigned): 10,000 × $0.0004/1000 = $0.004
- **Total: ~$0.51/month**

### Cost Optimization Tips

1. Use Intelligent Tiering for unpredictable access patterns
2. Implement lifecycle policies to move old files to Glacier
3. Enable S3 Bucket Keys to reduce encryption costs
4. Use CloudFront for frequently accessed files
5. Compress files before upload when possible
6. Delete temporary/unused files regularly

## Production Checklist

- [ ] S3 bucket created with appropriate name
- [ ] Bucket versioning enabled
- [ ] Server-side encryption enabled
- [ ] CORS configured (if needed)
- [ ] Lifecycle policies configured
- [ ] Access logging enabled
- [ ] IAM user created with least privilege
- [ ] Access keys generated and stored securely
- [ ] Environment variables configured
- [ ] Encryption key generated and stored securely
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
- [ ] Cost budgets set up
- [ ] Security audit performed
- [ ] Integration tests passed
- [ ] Load testing completed

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [S3 Pricing Calculator](https://calculator.aws/)

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Review application logs
3. Consult AWS Support (if subscribed)
4. Contact DevOps team
