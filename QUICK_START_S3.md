# AWS S3 Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### For Development (Local Storage)

```bash
# 1. Install dependencies
cd apps/api
npm install

# 2. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Add to .env
cat >> .env << EOF
UPLOAD_DIR=./uploads
FILE_ENCRYPTION_KEY=your-generated-key-here
AWS_S3_BUCKET=
EOF

# 4. Test
npm test -- storage.service.spec.ts

# 5. Start development server
npm run start:dev
```

**✅ You're ready!** Files will be stored locally in `./uploads/`

---

### For Production (AWS S3)

```bash
# 1. Install AWS CLI (if not installed)
# macOS: brew install awscli
# Linux: sudo apt install awscli
# Windows: https://aws.amazon.com/cli/

# 2. Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
# Output format: json

# 3. Run automated setup script
cd infrastructure/aws
./setup.sh production

# 4. Save the displayed credentials to .env
# The script will show you AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# 5. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 6. Update .env with all credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG...
AWS_S3_BUCKET=deepref-uploads-production
FILE_ENCRYPTION_KEY=your-generated-key

# 7. Install dependencies
npm install

# 8. Test
npm test -- storage.service.spec.ts

# 9. Deploy
npm run build
npm run start:prod
```

**✅ Production-ready!** Files will be encrypted and stored in S3.

---

## 📝 Manual Setup (Alternative)

### Step 1: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://deepref-uploads-production --region us-east-1

# Block public access
aws s3api put-public-access-block \
  --bucket deepref-uploads-production \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

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

### Step 2: Create IAM User

```bash
# Create user
aws iam create-user --user-name deepref-s3-uploader

# Create policy
aws iam create-policy \
  --policy-name DeepRefS3UploaderPolicy \
  --policy-document file://infrastructure/aws/iam-policy.json

# Attach policy (replace ACCOUNT_ID)
aws iam attach-user-policy \
  --user-name deepref-s3-uploader \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/DeepRefS3UploaderPolicy

# Create access keys
aws iam create-access-key --user-name deepref-s3-uploader
```

### Step 3: Configure Application

```bash
# Add to .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=deepref-uploads-production
FILE_ENCRYPTION_KEY=your-encryption-key
```

---

## 🧪 Testing

### Test File Upload

```typescript
// Test in your application
const file: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.jpg',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...]),
};

const result = await storageService.uploadFile(file, 'test', {
  encrypt: true,
});

console.log('Upload result:', result);
// {
//   filename: 'test_1234567890_abc123.jpg',
//   url: 'https://deepref-uploads-production.s3.amazonaws.com/test/...',
//   size: 1024,
//   mimetype: 'image/jpeg',
//   key: 'test/test_1234567890_abc123.jpg',
//   bucket: 'deepref-uploads-production',
//   etag: '"abc123..."'
// }
```

### Test Presigned URL

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/seekers/kyc/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "frontImage=@/path/to/test.jpg"

# Response
{
  "uploadId": "uuid",
  "status": "processing"
}
```

---

## 📖 Usage Examples

### Upload KYC Document with Encryption

```typescript
async uploadKYCDocument(file: Express.Multer.File, userId: string) {
  return await this.storageService.uploadFile(file, 'kyc/documents', {
    encrypt: true,
    storageClass: 'INTELLIGENT_TIERING',
    metadata: {
      userId,
      documentType: 'passport',
    },
    tags: {
      category: 'kyc',
      sensitive: 'true',
    },
  });
}
```

### Generate Secure Download Link

```typescript
async getDownloadUrl(fileKey: string) {
  return await this.storageService.getPresignedUrl(fileKey, {
    expiresIn: 3600, // 1 hour
  });
}
```

### Validate Before Upload

```typescript
async uploadWithValidation(file: Express.Multer.File) {
  const validation = this.storageService.validateFile(file, {
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  });

  if (!validation.valid) {
    throw new BadRequestException(validation.error);
  }

  return this.storageService.uploadFile(file, 'documents');
}
```

---

## 🔒 Security Checklist

- [x] Block all public access on S3 bucket
- [x] Enable versioning for data protection
- [x] Enable server-side encryption (SSE-S3)
- [x] Enable S3 Bucket Keys (cost reduction)
- [x] Use IAM policy with least privilege
- [x] Enable client-side encryption for sensitive files
- [x] Use presigned URLs (never public URLs)
- [x] Validate file types and sizes
- [x] Check file headers (magic numbers)
- [x] Block executable extensions
- [x] Implement rate limiting
- [x] Enable audit logging

---

## 💰 Cost Estimate

**For 10,000 files/month (2MB average):**

| Component | Cost/Month |
|-----------|------------|
| Storage (20GB) | $0.46 |
| PUT Requests | $0.05 |
| GET Requests | $0.004 |
| Encryption | $0.01 |
| **Total** | **~$0.52** |

**With optimizations:**
- Intelligent Tiering: -40%
- Lifecycle policies: -60% long-term
- Bucket Keys: -99% encryption cost

**Optimized**: ~$0.20-0.30/month

---

## 🚨 Troubleshooting

### "Access Denied" Error

```bash
# Check IAM permissions
aws iam get-user-policy --user-name deepref-s3-uploader --policy-name DeepRefS3UploaderPolicy

# Verify bucket exists
aws s3 ls s3://deepref-uploads-production
```

### "Bucket Not Found"

```bash
# Check bucket name in .env
echo $AWS_S3_BUCKET

# List all buckets
aws s3 ls
```

### "Invalid Encryption Key"

```bash
# Generate new key (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Verify key length
echo $FILE_ENCRYPTION_KEY | wc -c  # Should be 65 (64 + newline)
```

### File Upload Fails

```bash
# Check logs
tail -f apps/api/logs/error.log

# Enable debug mode
LOG_LEVEL=debug npm run start:dev

# Test S3 connection
aws s3 ls s3://deepref-uploads-production
```

---

## 📚 Documentation

- **Complete Guide**: [docs/AWS_S3_SETUP.md](./docs/AWS_S3_SETUP.md)
- **Security**: [docs/FILE_SECURITY_AND_ANTIVIRUS.md](./docs/FILE_SECURITY_AND_ANTIVIRUS.md)
- **Cost Optimization**: [docs/S3_COST_OPTIMIZATION.md](./docs/S3_COST_OPTIMIZATION.md)
- **Checklist**: [docs/S3_IMPLEMENTATION_CHECKLIST.md](./docs/S3_IMPLEMENTATION_CHECKLIST.md)
- **API Reference**: [docs/STORAGE_README.md](./docs/STORAGE_README.md)
- **Summary**: [S3_IMPLEMENTATION_SUMMARY.md](./S3_IMPLEMENTATION_SUMMARY.md)

---

## 🆘 Need Help?

1. Check [Troubleshooting](#-troubleshooting) section
2. Review [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
3. Check application logs
4. Contact DevOps team

---

## ✅ What's Next?

After setup:

1. **Test locally** with development environment
2. **Deploy to staging** for integration testing
3. **Run security audit** before production
4. **Set up monitoring** (CloudWatch)
5. **Configure alerts** (cost, errors)
6. **Deploy to production**
7. **Monitor for 24-48 hours**

---

**Time to Complete**: 30 minutes - 1 hour

**Difficulty**: Easy (with automated script) | Medium (manual)

**Status**: Production-Ready ✅
