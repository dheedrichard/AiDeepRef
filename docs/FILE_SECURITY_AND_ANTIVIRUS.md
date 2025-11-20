# File Security and Antivirus Integration Guide

## Overview

This guide covers file security measures and antivirus integration options for the DeepRef application's file upload system.

## Table of Contents

1. [Security Layers](#security-layers)
2. [Antivirus Integration Options](#antivirus-integration-options)
3. [ClamAV Integration](#clamav-integration)
4. [Cloud-Based Antivirus](#cloud-based-antivirus)
5. [Malware Prevention](#malware-prevention)
6. [Incident Response](#incident-response)

## Security Layers

### Layer 1: Client-Side Validation

**Frontend validation** (first line of defense):

```typescript
// apps/web/src/components/FileUpload.tsx
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxSize = 15 * 1024 * 1024; // 15MB

function validateFile(file: File): string | null {
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type';
  }
  if (file.size > maxSize) {
    return 'File too large';
  }
  return null;
}
```

### Layer 2: Server-Side Validation

**Backend validation** (implemented in `storage.service.ts`):

- MIME type checking
- File size limits
- Extension validation
- Magic number verification (file header inspection)
- Blocked executable extensions

### Layer 3: Antivirus Scanning

**Real-time malware detection** before file storage

### Layer 4: Encryption

**At-rest and in-transit encryption**:
- Server-side encryption (SSE-S3)
- Client-side encryption (AES-256-GCM)
- HTTPS/TLS for transmission

### Layer 5: Access Control

**Authorization and authentication**:
- IAM policies
- Presigned URLs with expiration
- User-based access control

## Antivirus Integration Options

### Option 1: ClamAV (Open Source)

**Pros**:
- Free and open source
- Self-hosted (full control)
- Active community
- Regular signature updates

**Cons**:
- Resource intensive
- Requires server maintenance
- May have false positives
- Slower than commercial solutions

### Option 2: AWS S3 Anti-Virus (Bucket AV)

**Pros**:
- Serverless (AWS Lambda)
- Automatic scaling
- Integrated with S3
- Pay-per-scan pricing

**Cons**:
- Additional AWS costs
- Vendor lock-in
- May have cold start delays

### Option 3: VirusTotal API

**Pros**:
- Multiple AV engines
- Comprehensive detection
- Easy integration
- Good for high-security needs

**Cons**:
- API rate limits
- Files sent to third party
- Privacy concerns for sensitive data
- Cost per scan

### Option 4: MetaDefender Cloud

**Pros**:
- Multi-scanning with 30+ engines
- Data sanitization (CDR)
- RESTful API
- Good accuracy

**Cons**:
- Subscription costs
- Third-party dependency
- Latency for API calls

## ClamAV Integration

### Installation

#### Docker Approach (Recommended)

Create `docker-compose.clamav.yml`:

```yaml
version: '3.8'

services:
  clamav:
    image: clamav/clamav:latest
    container_name: deepref-clamav
    ports:
      - '3310:3310'
    volumes:
      - clamav-data:/var/lib/clamav
    environment:
      - CLAMAV_NO_FRESHCLAM=false
    healthcheck:
      test: ['CMD', '/usr/local/bin/clamd', '--ping']
      interval: 60s
      timeout: 10s
      retries: 3

volumes:
  clamav-data:
```

Start ClamAV:

```bash
docker-compose -f docker-compose.clamav.yml up -d
```

#### Manual Installation (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y clamav clamav-daemon clamav-freshclam

# Update virus definitions
sudo freshclam

# Start ClamAV daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

### Node.js Integration

Install the ClamAV client:

```bash
npm install clamscan
```

Create `antivirus.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeClam from 'clamscan';

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  file: string;
}

@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);
  private clamScan: NodeClam | null = null;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get('ANTIVIRUS_ENABLED', false);
    if (this.enabled) {
      this.initializeClamAV();
    }
  }

  private async initializeClamAV(): Promise<void> {
    try {
      this.clamScan = await new NodeClam().init({
        clamdscan: {
          host: this.configService.get('CLAMAV_HOST', 'localhost'),
          port: this.configService.get('CLAMAV_PORT', 3310),
          timeout: 60000,
        },
        preference: 'clamdscan',
      });

      this.logger.log('ClamAV initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize ClamAV: ${error.message}`);
      this.enabled = false;
    }
  }

  async scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
    if (!this.enabled || !this.clamScan) {
      this.logger.warn('Antivirus scanning disabled or not available');
      return {
        isInfected: false,
        viruses: [],
        file: filename,
      };
    }

    try {
      const result = await this.clamScan.scanBuffer(buffer, 60000, 10 * 1024 * 1024);

      if (result.isInfected) {
        this.logger.warn(`Virus detected in ${filename}: ${result.viruses.join(', ')}`);
      }

      return {
        isInfected: result.isInfected || false,
        viruses: result.viruses || [],
        file: filename,
      };
    } catch (error) {
      this.logger.error(`Antivirus scan failed: ${error.message}`);
      throw error;
    }
  }

  async scanFile(filePath: string): Promise<ScanResult> {
    if (!this.enabled || !this.clamScan) {
      this.logger.warn('Antivirus scanning disabled or not available');
      return {
        isInfected: false,
        viruses: [],
        file: filePath,
      };
    }

    try {
      const result = await this.clamScan.scanFile(filePath);

      if (result.isInfected) {
        this.logger.warn(`Virus detected in ${filePath}: ${result.viruses.join(', ')}`);
      }

      return {
        isInfected: result.isInfected || false,
        viruses: result.viruses || [],
        file: filePath,
      };
    } catch (error) {
      this.logger.error(`Antivirus scan failed: ${error.message}`);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.clamScan !== null;
  }
}
```

### Update Storage Service

Modify `storage.service.ts` to integrate antivirus scanning:

```typescript
// Add to constructor
constructor(
  private configService: ConfigService,
  private antivirusService: AntivirusService, // Inject
) {
  // ... existing code
}

// Update uploadFile method
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

  // Scan for viruses
  if (this.antivirusService.isEnabled()) {
    const scanResult = await this.antivirusService.scanBuffer(
      file.buffer,
      file.originalname,
    );

    if (scanResult.isInfected) {
      this.logger.error(
        `Malware detected: ${scanResult.viruses.join(', ')} in ${file.originalname}`,
      );
      throw new BadRequestException(
        `File rejected: Malware detected (${scanResult.viruses.join(', ')})`,
      );
    }
  }

  // Proceed with upload
  if (this.useS3 && this.s3Client) {
    return this.uploadToS3(file, folder, options);
  }
  return this.uploadToLocal(file, folder);
}
```

### Environment Configuration

Add to `.env`:

```bash
# Antivirus Configuration
ANTIVIRUS_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

### Testing ClamAV

Create test file with EICAR test string:

```bash
# Create EICAR test file (harmless malware test signature)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
```

Test the antivirus service:

```typescript
describe('AntivirusService', () => {
  it('should detect EICAR test virus', async () => {
    const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const buffer = Buffer.from(eicarString);

    const result = await antivirusService.scanBuffer(buffer, 'eicar.txt');

    expect(result.isInfected).toBe(true);
    expect(result.viruses).toContain('EICAR');
  });
});
```

## Cloud-Based Antivirus

### AWS S3 Anti-Virus Setup

#### 1. Install Bucket AV

```bash
# Using CloudFormation
aws cloudformation create-stack \
  --stack-name bucket-antivirus \
  --template-url https://s3.amazonaws.com/bucket-antivirus-public/latest/bucket-antivirus.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=BucketName,ParameterValue=deepref-uploads-production
```

#### 2. Configure S3 Event Notifications

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:region:account:function:bucket-antivirus-function",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "kyc/"
            }
          ]
        }
      }
    }
  ]
}
```

#### 3. Handle Scan Results

Create Lambda function or webhook to handle scan results:

```typescript
// Handle S3 object tags added by antivirus scanner
async function checkFileStatus(s3Key: string): Promise<boolean> {
  const command = new GetObjectTaggingCommand({
    Bucket: this.s3Bucket,
    Key: s3Key,
  });

  const response = await this.s3Client.send(command);
  const tags = response.TagSet || [];

  const scanStatus = tags.find(tag => tag.Key === 'av-status')?.Value;

  if (scanStatus === 'INFECTED') {
    // Delete infected file
    await this.deleteFile(s3Key);
    return false;
  }

  return scanStatus === 'CLEAN';
}
```

## Malware Prevention

### File Type Restrictions

Implement strict file type restrictions:

```typescript
const SAFE_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['application/pdf'],
  // Never allow: executables, scripts, archives
};
```

### Content Security Policy

Add CSP headers to prevent XSS:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

### Rate Limiting

Prevent abuse with rate limiting:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 uploads per minute
@Post('upload')
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // ... upload logic
}
```

### Sandboxing

For high-security environments, consider sandboxed file processing:

```bash
# Using Docker for sandboxed file processing
docker run --rm -i \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  alpine:latest \
  file-processor < input.file > output.file
```

## Incident Response

### Malware Detection Workflow

1. **Detection**: Antivirus identifies malicious file
2. **Quarantine**: Move file to quarantine bucket/folder
3. **Notification**: Alert security team
4. **Investigation**: Review user account and related uploads
5. **Cleanup**: Remove infected files and update signatures
6. **Response**: Block user if necessary, update security rules

### Logging and Monitoring

```typescript
async scanAndLog(file: Express.Multer.File, userId: string): Promise<void> {
  const scanResult = await this.antivirusService.scanBuffer(
    file.buffer,
    file.originalname,
  );

  // Log all scan results
  await this.auditLog.create({
    userId,
    action: 'FILE_SCAN',
    filename: file.originalname,
    scanResult: scanResult.isInfected ? 'INFECTED' : 'CLEAN',
    viruses: scanResult.viruses,
    timestamp: new Date(),
    ipAddress: request.ip,
  });

  if (scanResult.isInfected) {
    // Alert security team
    await this.emailService.sendSecurityAlert({
      subject: `Malware Detected: ${file.originalname}`,
      userId,
      viruses: scanResult.viruses,
      timestamp: new Date(),
    });

    // Log to SIEM
    this.logger.error({
      event: 'MALWARE_DETECTED',
      userId,
      filename: file.originalname,
      viruses: scanResult.viruses,
    });
  }
}
```

### Quarantine Implementation

```typescript
async quarantineFile(file: Express.Multer.File, reason: string): Promise<void> {
  const quarantinePath = `quarantine/${Date.now()}_${file.originalname}`;

  // Upload to quarantine folder with restricted access
  await this.uploadToS3(file, quarantinePath, {
    storageClass: 'GLACIER',
    metadata: {
      quarantineReason: reason,
      originalFilename: file.originalname,
      quarantineDate: new Date().toISOString(),
    },
    tags: {
      status: 'quarantined',
      reason,
    },
  });

  this.logger.warn(`File quarantined: ${file.originalname} - Reason: ${reason}`);
}
```

## Best Practices

1. **Defense in Depth**: Use multiple security layers
2. **Regular Updates**: Keep antivirus signatures current
3. **Monitoring**: Log and monitor all file operations
4. **Incident Response**: Have a plan for malware detection
5. **User Education**: Inform users about file upload policies
6. **Testing**: Regularly test with EICAR and real malware samples
7. **Performance**: Balance security with upload speed
8. **Privacy**: Consider data privacy when using cloud AV services

## Performance Optimization

### Asynchronous Scanning

For large files, scan asynchronously:

```typescript
@Post('upload')
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Upload first
  const result = await this.storageService.uploadFile(file, 'kyc', {
    encrypt: true,
  });

  // Scan asynchronously (don't block response)
  this.scanQueue.add('scan-file', {
    fileKey: result.key,
    userId: user.id,
  });

  return {
    uploadId: result.key,
    status: 'pending_scan',
  };
}

// In queue processor
@Process('scan-file')
async handleScan(job: Job) {
  const { fileKey, userId } = job.data;

  // Download and scan
  const fileBuffer = await this.s3.getObject(fileKey);
  const scanResult = await this.antivirus.scanBuffer(fileBuffer, fileKey);

  if (scanResult.isInfected) {
    // Delete and notify
    await this.storageService.deleteFile(fileKey);
    await this.notifyUser(userId, 'File rejected due to malware');
  } else {
    // Update status
    await this.updateFileStatus(fileKey, 'verified');
  }
}
```

## Cost Considerations

### ClamAV Costs

- **Server**: $10-50/month (depending on size)
- **Storage**: Minimal for signatures
- **Bandwidth**: Minimal

### Cloud AV Costs

- **Bucket AV**: ~$0.001 per scan
- **VirusTotal**: $500/month (commercial license)
- **MetaDefender**: $0.003-0.01 per scan

### Recommendations

- **Development**: Use ClamAV (free, self-hosted)
- **Production (low volume)**: Use ClamAV or Bucket AV
- **Production (high volume)**: Use Bucket AV with async processing
- **High security**: Use VirusTotal or MetaDefender

## Compliance

### GDPR Considerations

When using cloud-based AV:
- Files may be sent to third parties
- Update privacy policy
- Get user consent for sensitive data
- Use data processing agreements

### HIPAA/PCI-DSS

For regulated data:
- Use self-hosted ClamAV
- Encrypt files before scanning
- Keep audit logs
- Regular security audits

## Resources

- [ClamAV Documentation](https://docs.clamav.net/)
- [Bucket AV GitHub](https://github.com/upsidetravel/bucket-antivirus-function)
- [VirusTotal API](https://developers.virustotal.com/)
- [OWASP File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
