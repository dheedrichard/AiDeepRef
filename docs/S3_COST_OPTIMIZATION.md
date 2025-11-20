# AWS S3 Cost Optimization and Backup Strategy

## Overview

This guide provides strategies for optimizing AWS S3 costs while maintaining data durability and implementing comprehensive backup strategies for the DeepRef application.

## Table of Contents

1. [Cost Analysis](#cost-analysis)
2. [Storage Class Optimization](#storage-class-optimization)
3. [Lifecycle Policies](#lifecycle-policies)
4. [Request Optimization](#request-optimization)
5. [Backup Strategy](#backup-strategy)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Best Practices](#best-practices)

## Cost Analysis

### S3 Pricing Components (us-east-1)

#### Storage Costs
- **S3 Standard**: $0.023 per GB/month
- **S3 Intelligent-Tiering**:
  - Frequent Access: $0.023 per GB/month
  - Infrequent Access: $0.0125 per GB/month
  - Archive: $0.004 per GB/month
  - Monitoring: $0.0025 per 1,000 objects
- **S3 Standard-IA**: $0.0125 per GB/month (min 30 days, 128KB)
- **S3 One Zone-IA**: $0.01 per GB/month (min 30 days, 128KB)
- **S3 Glacier Instant Retrieval**: $0.004 per GB/month
- **S3 Glacier Flexible Retrieval**: $0.0036 per GB/month
- **S3 Glacier Deep Archive**: $0.00099 per GB/month

#### Request Costs
- **PUT/COPY/POST/LIST**: $0.005 per 1,000 requests
- **GET/SELECT**: $0.0004 per 1,000 requests
- **Lifecycle Transitions**: $0.01 per 1,000 transitions
- **Data Retrieval (IA)**: $0.01 per GB
- **Data Retrieval (Glacier)**: Varies by retrieval speed

#### Data Transfer
- **OUT to Internet**: First 1GB free, then $0.09 per GB
- **OUT to CloudFront**: Free
- **IN from Internet**: Free
- **Between regions**: $0.02 per GB

### Example Cost Calculation

**Scenario**: 10,000 KYC documents uploaded per month

```
Storage:
- 10,000 files × 2MB average = 20GB
- Using Intelligent-Tiering: 20GB × $0.023 = $0.46/month
- Monitoring: 10,000 objects × $0.0025/1000 = $0.025/month

Requests:
- Uploads: 10,000 PUT × $0.005/1000 = $0.05/month
- Downloads (presigned URLs): 10,000 GET × $0.0004/1000 = $0.004/month
- Lifecycle transitions: 5,000 × $0.01/1000 = $0.05/month

Total: ~$0.59/month
```

**After 1 year** (with lifecycle policies):
```
Active storage (3 months): 60,000 files × 2MB = 120GB
- Intelligent-Tiering (frequent): 40GB × $0.023 = $0.92
- Intelligent-Tiering (infrequent): 80GB × $0.0125 = $1.00

Archive (9 months): 90,000 files × 2MB = 180GB
- Glacier Flexible: 180GB × $0.0036 = $0.65

Total storage: ~$2.57/month
```

## Storage Class Optimization

### Recommended Storage Classes by Use Case

#### 1. Active KYC Documents (0-90 days)
```typescript
const uploadOptions = {
  storageClass: 'INTELLIGENT_TIERING', // Auto-optimizes based on access
  metadata: {
    category: 'kyc',
    retentionPeriod: '7years',
  },
};
```

**Why**: Automatically moves between tiers based on access patterns.

#### 2. Archived KYC Documents (90+ days)
```typescript
// Via lifecycle policy (automatic transition)
{
  "Transitions": [
    {
      "Days": 90,
      "StorageClass": "GLACIER_IR" // Instant Retrieval
    },
    {
      "Days": 365,
      "StorageClass": "DEEP_ARCHIVE" // Long-term archive
    }
  ]
}
```

**Why**: Reduces costs for infrequently accessed documents while maintaining compliance.

#### 3. Temporary Files (processing, thumbnails)
```typescript
const uploadOptions = {
  storageClass: 'ONEZONE_IA', // Lower cost for non-critical data
};
```

**Why**: Cheaper for temporary files that can be regenerated.

### Decision Matrix

| Access Pattern | Age | Recommended Class | Cost/GB/month |
|---------------|-----|-------------------|---------------|
| Frequent (daily) | Any | INTELLIGENT_TIERING | $0.023 |
| Occasional (weekly) | 0-30d | STANDARD | $0.023 |
| Occasional (weekly) | 30d+ | STANDARD_IA | $0.0125 |
| Rare (monthly) | 30d+ | GLACIER_IR | $0.004 |
| Archive (yearly) | 90d+ | GLACIER | $0.0036 |
| Compliance archive | 365d+ | DEEP_ARCHIVE | $0.00099 |

## Lifecycle Policies

### Comprehensive Lifecycle Policy

Create `s3-lifecycle-policy.json`:

```json
{
  "Rules": [
    {
      "Id": "KYC-Documents-Lifecycle",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Prefix": "kyc/",
          "Tags": [
            {
              "Key": "category",
              "Value": "kyc"
            }
          ]
        }
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 2555,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      },
      "Expiration": {
        "Days": 2920
      }
    },
    {
      "Id": "Temporary-Files-Cleanup",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "Failed-Upload-Cleanup",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "Id": "Thumbnail-Cache-Lifecycle",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "thumbnails/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "ONEZONE_IA"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

Apply lifecycle policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket deepref-uploads-production \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

### Retention Policy Implementation

For compliance (KYC documents must be kept for 7 years):

```typescript
// In storage.service.ts
async uploadKYCDocument(file: Express.Multer.File, userId: string): Promise<UploadResult> {
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 7);

  const result = await this.uploadFile(file, 'kyc/documents', {
    encrypt: true,
    storageClass: 'INTELLIGENT_TIERING',
    metadata: {
      userId,
      retentionUntil: retentionDate.toISOString(),
      complianceType: 'KYC',
    },
    tags: {
      category: 'kyc',
      compliance: 'required',
      retentionYears: '7',
    },
  });

  return result;
}
```

## Request Optimization

### 1. Reduce PUT Requests

**Problem**: Each file upload costs $0.005 per 1,000 requests.

**Solution**: Batch uploads when possible.

```typescript
// Instead of individual uploads
const results = await Promise.all(
  files.map(file => storageService.uploadFile(file, 'kyc'))
);

// Use multipart upload for large files (>5MB)
async uploadLargeFile(file: Express.Multer.File): Promise<UploadResult> {
  if (file.size > 5 * 1024 * 1024) {
    return this.multipartUpload(file);
  }
  return this.uploadFile(file);
}
```

### 2. Reduce GET Requests

**Problem**: Frequent downloads increase costs.

**Solutions**:

#### A. Use CloudFront CDN

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name deepref-uploads-production.s3.amazonaws.com \
  --default-root-object index.html
```

Benefits:
- Free data transfer from S3 to CloudFront
- Lower GET request costs
- Better performance (edge caching)
- Reduced S3 GET requests

#### B. Implement Caching

```typescript
// Cache presigned URLs
@Injectable()
export class StorageService {
  private urlCache = new Map<string, { url: string; expiry: number }>();

  async getPresignedUrlCached(fileKey: string): Promise<string> {
    const cached = this.urlCache.get(fileKey);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      return cached.url;
    }

    const url = await this.getPresignedUrl(fileKey, {
      expiresIn: 3600,
    });

    this.urlCache.set(fileKey, {
      url,
      expiry: now + 3500 * 1000, // Cache for 58 minutes
    });

    return url;
  }
}
```

#### C. Use S3 Select

For large files, query only what you need:

```typescript
import { SelectObjectContentCommand } from '@aws-sdk/client-s3';

async queryLargeFile(key: string, query: string): Promise<any> {
  const command = new SelectObjectContentCommand({
    Bucket: this.s3Bucket,
    Key: key,
    ExpressionType: 'SQL',
    Expression: query,
    InputSerialization: {
      JSON: { Type: 'DOCUMENT' },
    },
    OutputSerialization: {
      JSON: {},
    },
  });

  const response = await this.s3Client.send(command);
  // Process streaming response
}
```

### 3. Optimize LIST Operations

**Problem**: Listing objects can be expensive for large buckets.

**Solution**: Use prefixes and pagination.

```typescript
async listFilesPaginated(prefix: string, maxKeys: number = 100): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: this.s3Bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await this.s3Client.send(command);
  return (response.Contents || []).map(obj => obj.Key!);
}
```

### 4. Enable S3 Bucket Keys

Reduces encryption costs by up to 99%:

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

## Backup Strategy

### Multi-Region Replication

#### Setup Cross-Region Replication (CRR)

1. **Create backup bucket in different region**:

```bash
aws s3 mb s3://deepref-uploads-backup --region eu-west-1
```

2. **Enable versioning on both buckets**:

```bash
aws s3api put-bucket-versioning \
  --bucket deepref-uploads-production \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket deepref-uploads-backup \
  --versioning-configuration Status=Enabled
```

3. **Create IAM role for replication**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

4. **Configure replication**:

```json
{
  "Role": "arn:aws:iam::ACCOUNT_ID:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "kyc/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::deepref-uploads-backup",
        "StorageClass": "GLACIER",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

### Backup to Glacier

For cost-effective long-term backups:

```typescript
async archiveToGlacier(fileKey: string): Promise<void> {
  // Copy to archive bucket
  await this.s3Client.send(new CopyObjectCommand({
    Bucket: 'deepref-archive',
    CopySource: `${this.s3Bucket}/${fileKey}`,
    Key: fileKey,
    StorageClass: 'DEEP_ARCHIVE',
    TaggingDirective: 'COPY',
  }));

  this.logger.log(`File archived to Glacier: ${fileKey}`);
}
```

### Point-in-Time Recovery

Enable versioning for recovery:

```typescript
async restoreVersion(fileKey: string, versionId: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: this.s3Bucket,
    CopySource: `${this.s3Bucket}/${fileKey}?versionId=${versionId}`,
    Key: fileKey,
  });

  await this.s3Client.send(command);
  this.logger.log(`Restored version ${versionId} of ${fileKey}`);
}
```

### Backup Automation

Schedule regular backups using cron or AWS Lambda:

```typescript
// apps/api/src/tasks/backup.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from '../common/services/storage.service';

@Injectable()
export class BackupTask {
  private readonly logger = new Logger(BackupTask.name);

  constructor(private storageService: StorageService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyBackup() {
    this.logger.log('Starting daily backup...');

    try {
      // Get all KYC documents uploaded in last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Implement backup logic
      await this.backupRecentFiles(yesterday);

      this.logger.log('Daily backup completed successfully');
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`, error.stack);
    }
  }

  private async backupRecentFiles(since: Date): Promise<void> {
    // Implementation details
  }
}
```

### Disaster Recovery Plan

1. **RPO (Recovery Point Objective)**: 24 hours
2. **RTO (Recovery Time Objective)**: 4 hours

**Recovery Procedure**:

```bash
# 1. Verify backup bucket
aws s3 ls s3://deepref-uploads-backup/kyc/

# 2. Sync from backup to production
aws s3 sync \
  s3://deepref-uploads-backup/kyc/ \
  s3://deepref-uploads-production/kyc/ \
  --storage-class INTELLIGENT_TIERING

# 3. Verify file count
aws s3 ls s3://deepref-uploads-production/kyc/ --recursive | wc -l
```

## Monitoring and Alerts

### CloudWatch Metrics

Monitor S3 costs and usage:

```typescript
// Create CloudWatch alarm for storage costs
async createCostAlarm(): Promise<void> {
  const cloudwatch = new CloudWatchClient({ region: this.s3Region });

  await cloudwatch.send(new PutMetricAlarmCommand({
    AlarmName: 'S3-Storage-Cost-Alert',
    MetricName: 'EstimatedCharges',
    Namespace: 'AWS/Billing',
    Statistic: 'Maximum',
    Period: 86400, // 1 day
    EvaluationPeriods: 1,
    Threshold: 100, // $100
    ComparisonOperator: 'GreaterThanThreshold',
    AlarmActions: ['arn:aws:sns:region:account:billing-alerts'],
  }));
}
```

### S3 Storage Lens

Enable S3 Storage Lens for detailed analytics:

```bash
aws s3control put-storage-lens-configuration \
  --account-id 123456789012 \
  --config-id default-lens \
  --storage-lens-configuration file://storage-lens-config.json
```

### Cost Anomaly Detection

```bash
# Enable AWS Cost Anomaly Detection
aws ce create-anomaly-monitor \
  --anomaly-monitor Name=S3-Cost-Monitor,MonitorType=DIMENSIONAL \
  --monitor-specification '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Simple Storage Service"]}}'
```

## Best Practices

### 1. Use Intelligent-Tiering as Default

```typescript
// Set default storage class
const DEFAULT_STORAGE_CLASS = 'INTELLIGENT_TIERING';
```

### 2. Tag Everything

```typescript
const uploadOptions = {
  tags: {
    project: 'deepref',
    environment: 'production',
    cost-center: 'engineering',
    retention: '7years',
  },
};
```

### 3. Regular Cleanup

```typescript
@Cron(CronExpression.EVERY_WEEK)
async cleanupOrphanedFiles() {
  // Find files not referenced in database
  // Delete after verification
}
```

### 4. Compress Files

```typescript
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

async uploadCompressed(file: Express.Multer.File): Promise<UploadResult> {
  const compressed = await gzipAsync(file.buffer);

  return this.uploadToS3({
    ...file,
    buffer: compressed,
    mimetype: 'application/gzip',
  }, folder, {
    ...options,
    metadata: {
      ...options.metadata,
      'Content-Encoding': 'gzip',
      originalSize: file.size.toString(),
    },
  });
}
```

### 5. Monitor and Optimize

Create monthly cost reports:

```typescript
@Cron('0 0 1 * *') // First day of month
async generateCostReport() {
  const costExplorer = new CostExplorerClient({ region: 'us-east-1' });

  const response = await costExplorer.send(new GetCostAndUsageCommand({
    TimePeriod: {
      Start: this.getFirstDayLastMonth(),
      End: this.getLastDayLastMonth(),
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: ['Amazon Simple Storage Service'],
      },
    },
  }));

  // Send report
  await this.emailService.sendCostReport(response);
}
```

## Estimated Implementation Time

- **Basic S3 setup**: 2-4 hours
- **Lifecycle policies**: 1-2 hours
- **Backup configuration**: 2-3 hours
- **Monitoring setup**: 2-3 hours
- **Cost optimization**: 4-6 hours
- **Testing and validation**: 4-6 hours

**Total**: 15-24 hours

## Resources

- [S3 Pricing Calculator](https://calculator.aws/)
- [S3 Storage Lens](https://aws.amazon.com/s3/storage-lens/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
