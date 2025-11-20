# AWS S3 File Storage Implementation Checklist

## Pre-Implementation

### Requirements Gathering
- [ ] Determine storage requirements (estimated file count, sizes)
- [ ] Define compliance requirements (data retention, encryption)
- [ ] Identify access patterns (upload frequency, download frequency)
- [ ] Calculate budget and cost constraints
- [ ] Review security requirements

### Team Preparation
- [ ] Assign implementation lead
- [ ] Schedule implementation timeline
- [ ] Prepare development environment
- [ ] Set up staging environment for testing
- [ ] Brief team on security protocols

## Phase 1: AWS Account Setup (Day 1)

### AWS Infrastructure
- [ ] Create or verify AWS account
- [ ] Set up billing alerts ($10, $50, $100 thresholds)
- [ ] Enable MFA on root account
- [ ] Create IAM admin user (not root)
- [ ] Set up AWS CLI with credentials
- [ ] Configure AWS SDK credentials locally

### Cost Management
- [ ] Set up AWS Budgets
- [ ] Enable Cost Explorer
- [ ] Create cost anomaly detection monitor
- [ ] Tag strategy documentation

## Phase 2: S3 Bucket Configuration (Day 1-2)

### Bucket Creation
- [ ] Create primary S3 bucket (production)
  - Name: `deepref-uploads-production`
  - Region: `us-east-1` (or preferred)
  - [ ] Block all public access ✓
  - [ ] Enable versioning ✓
- [ ] Create backup S3 bucket (different region)
  - Name: `deepref-uploads-backup`
  - Region: `eu-west-1` (or preferred)
- [ ] Create archive bucket (optional)
  - Name: `deepref-archive`

### Bucket Security
- [ ] Enable default encryption (SSE-S3 or SSE-KMS)
- [ ] Enable S3 Bucket Keys (cost reduction)
- [ ] Configure bucket policy (deny unencrypted uploads)
- [ ] Enable access logging
- [ ] Create logging bucket
- [ ] Enable CloudTrail for S3 data events
- [ ] Configure S3 Object Lock (if needed for compliance)

### Bucket Configuration
- [ ] Configure CORS policy (if needed)
- [ ] Set up lifecycle policies
  - [ ] KYC documents lifecycle
  - [ ] Temporary files cleanup
  - [ ] Incomplete multipart upload cleanup
- [ ] Configure replication (CRR)
- [ ] Set up S3 Transfer Acceleration (if needed)
- [ ] Enable S3 Inventory (monthly reports)

## Phase 3: IAM Configuration (Day 2)

### IAM User/Role Setup
- [ ] Create IAM user: `deepref-s3-uploader`
- [ ] Create IAM policy: `DeepRefS3UploaderPolicy`
  - [ ] ListBucket permission
  - [ ] GetObject permission
  - [ ] PutObject permission
  - [ ] DeleteObject permission
  - [ ] HeadObject permission
- [ ] Attach policy to user
- [ ] Generate access keys
- [ ] Store keys in secure location (1Password, AWS Secrets Manager)
- [ ] Document key rotation schedule (90 days)

### Cross-Service Permissions
- [ ] Create S3 replication role (if using CRR)
- [ ] Create Lambda execution role (if using serverless)
- [ ] Configure CloudFront Origin Access Identity (if using CDN)

## Phase 4: Application Code Implementation (Day 2-4)

### Dependencies
- [ ] Install AWS SDK v3 packages
  ```bash
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```
- [ ] Install antivirus package (optional)
  ```bash
  npm install clamscan
  ```

### Code Implementation
- [ ] Create type definitions (`src/types/express.d.ts`)
- [ ] Implement storage service (`storage.service.ts`)
  - [ ] S3 client initialization
  - [ ] Upload method with encryption
  - [ ] Delete method
  - [ ] Presigned URL generation
  - [ ] File validation
  - [ ] Error handling and retry logic
  - [ ] File header validation (magic numbers)
- [ ] Update seekers service (`seekers.service.ts`)
  - [ ] Integrate storage service
  - [ ] Add encryption for KYC uploads
  - [ ] Update metadata and tags
- [ ] Implement antivirus service (optional)
  - [ ] ClamAV integration
  - [ ] Scan before upload
  - [ ] Quarantine mechanism

### Testing
- [ ] Write unit tests (`storage.service.spec.ts`)
  - [ ] File validation tests
  - [ ] Local upload tests
  - [ ] Encryption/decryption tests
  - [ ] Filename generation tests
- [ ] Write integration tests (S3)
  - [ ] Upload to S3 test
  - [ ] Presigned URL test
  - [ ] Delete from S3 test
  - [ ] File metadata test
- [ ] Test error scenarios
  - [ ] Invalid credentials
  - [ ] Network failures
  - [ ] Malformed files
  - [ ] Oversized files

## Phase 5: Environment Configuration (Day 3)

### Development Environment
- [ ] Generate encryption key
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Update `.env` file
  ```bash
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=your-key
  AWS_SECRET_ACCESS_KEY=your-secret
  AWS_S3_BUCKET=deepref-uploads-dev
  FILE_ENCRYPTION_KEY=your-encryption-key
  UPLOAD_DIR=./uploads
  ```
- [ ] Test local development setup
- [ ] Verify S3 fallback to local storage works

### Staging Environment
- [ ] Create staging S3 bucket
- [ ] Configure staging environment variables
- [ ] Test staging deployment
- [ ] Run integration tests against staging
- [ ] Performance testing

### Production Environment
- [ ] Store secrets in AWS Secrets Manager
- [ ] Configure production environment variables
- [ ] Set up secret rotation
- [ ] Document secret retrieval process
- [ ] Test secret rotation

## Phase 6: Security Hardening (Day 4-5)

### Application Security
- [ ] Implement file validation
  - [ ] MIME type checking
  - [ ] File size limits
  - [ ] Extension validation
  - [ ] Magic number verification
  - [ ] Blocked extension list
- [ ] Implement rate limiting
  - [ ] Upload rate limits (10/min per user)
  - [ ] Download rate limits
- [ ] Add request logging
- [ ] Implement audit trail
- [ ] Add security headers (Helmet)
- [ ] Configure CORS properly

### Antivirus Integration (Optional)
- [ ] Set up ClamAV (Docker or EC2)
- [ ] Configure virus scanning
- [ ] Implement quarantine mechanism
- [ ] Set up malware detection alerts
- [ ] Test with EICAR test file

### Encryption
- [ ] Verify server-side encryption (SSE-S3)
- [ ] Test client-side encryption
- [ ] Verify encryption key security
- [ ] Document key management process
- [ ] Test decryption process

## Phase 7: Monitoring and Alerting (Day 5)

### CloudWatch Setup
- [ ] Create CloudWatch dashboard
  - [ ] S3 bucket metrics
  - [ ] Request metrics
  - [ ] Error metrics
  - [ ] Cost metrics
- [ ] Set up alarms
  - [ ] High error rate (>1%)
  - [ ] Storage cost threshold ($100/month)
  - [ ] Request rate anomalies
  - [ ] Failed uploads
- [ ] Configure SNS topics for alerts
- [ ] Test alert notifications

### Logging
- [ ] Enable S3 access logging
- [ ] Configure CloudTrail
- [ ] Set up application logging
  - [ ] Upload events
  - [ ] Delete events
  - [ ] Scan results (if antivirus)
  - [ ] Security events
- [ ] Configure log retention
- [ ] Set up log analysis (CloudWatch Insights)

### Cost Tracking
- [ ] Enable S3 Storage Lens
- [ ] Tag all resources
  - [ ] Project: deepref
  - [ ] Environment: production/staging/dev
  - [ ] Cost-center: engineering
- [ ] Create cost allocation tags
- [ ] Set up monthly cost reports
- [ ] Review and optimize costs

## Phase 8: Backup and Disaster Recovery (Day 6)

### Backup Configuration
- [ ] Enable S3 versioning (if not done)
- [ ] Configure cross-region replication
  - [ ] Set up backup bucket
  - [ ] Create replication rule
  - [ ] Test replication
- [ ] Set up point-in-time recovery
- [ ] Document backup retention policy
- [ ] Test backup restoration

### Disaster Recovery
- [ ] Document RPO (Recovery Point Objective)
- [ ] Document RTO (Recovery Time Objective)
- [ ] Create disaster recovery runbook
- [ ] Test DR procedures
  - [ ] Simulate bucket deletion
  - [ ] Restore from backup
  - [ ] Verify data integrity
- [ ] Schedule regular DR drills (quarterly)

## Phase 9: Performance Optimization (Day 6-7)

### Upload Optimization
- [ ] Implement multipart upload for large files (>5MB)
- [ ] Add upload progress tracking
- [ ] Optimize retry logic
- [ ] Test upload performance
- [ ] Implement async scanning (if using antivirus)

### Download Optimization
- [ ] Set up CloudFront distribution (optional)
- [ ] Configure presigned URL caching
- [ ] Implement CDN for static assets
- [ ] Test download performance
- [ ] Optimize presigned URL expiration

### Cost Optimization
- [ ] Review storage class usage
- [ ] Implement lifecycle policies
- [ ] Enable Intelligent-Tiering
- [ ] Compress files before upload (if applicable)
- [ ] Clean up orphaned files
- [ ] Review and optimize request patterns

## Phase 10: Documentation (Day 7)

### Technical Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Architecture diagrams
- [ ] S3 bucket structure documentation
- [ ] IAM policy documentation
- [ ] Encryption key management guide
- [ ] Troubleshooting guide

### Operational Documentation
- [ ] Deployment guide
- [ ] Backup and restore procedures
- [ ] Disaster recovery runbook
- [ ] Monitoring and alerting guide
- [ ] Cost optimization guide
- [ ] Security incident response plan

### Developer Documentation
- [ ] Setup instructions for local development
- [ ] Testing guide
- [ ] Code examples
- [ ] Integration guide
- [ ] FAQ

## Phase 11: Testing (Day 7-8)

### Functional Testing
- [ ] Upload single file (JPEG, PNG, PDF)
- [ ] Upload multiple files
- [ ] Delete file
- [ ] Generate presigned URL
- [ ] Download via presigned URL
- [ ] Test encryption/decryption
- [ ] Test file validation (valid files)
- [ ] Test file rejection (invalid files)
- [ ] Test antivirus scanning (if enabled)

### Security Testing
- [ ] Upload malicious file (EICAR test)
- [ ] Upload oversized file
- [ ] Upload with wrong MIME type
- [ ] Test with invalid credentials
- [ ] Test rate limiting
- [ ] Test presigned URL expiration
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] Test blocked extensions

### Performance Testing
- [ ] Concurrent uploads (10 users)
- [ ] Large file upload (10MB)
- [ ] Batch upload (100 files)
- [ ] Download performance test
- [ ] Presigned URL generation performance
- [ ] Database query performance (file metadata)

### Integration Testing
- [ ] End-to-end KYC flow
  - [ ] Register user
  - [ ] Upload ID document
  - [ ] Upload selfie
  - [ ] Verify storage
  - [ ] Access via presigned URL
- [ ] Backup and restore flow
- [ ] Disaster recovery scenario

## Phase 12: Deployment (Day 8-9)

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation reviewed
- [ ] Backup procedures tested
- [ ] Rollback plan documented

### Staging Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Run full test suite
- [ ] Performance validation
- [ ] Security scan
- [ ] Stakeholder approval

### Production Deployment
- [ ] Schedule deployment window
- [ ] Notify stakeholders
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Verify backups
- [ ] Update documentation with production URLs

### Post-Deployment
- [ ] Monitor for 24 hours
- [ ] Review logs for errors
- [ ] Check cost metrics
- [ ] Verify alerts working
- [ ] Conduct retrospective
- [ ] Document lessons learned

## Phase 13: Ongoing Maintenance

### Daily
- [ ] Monitor error rates
- [ ] Check CloudWatch alerts
- [ ] Review security logs

### Weekly
- [ ] Review access logs
- [ ] Check storage growth
- [ ] Review cost trends
- [ ] Clean up temp files

### Monthly
- [ ] Review and optimize costs
- [ ] Update virus signatures (if self-hosted)
- [ ] Review and update lifecycle policies
- [ ] Generate usage reports
- [ ] Security audit

### Quarterly
- [ ] Rotate access keys
- [ ] Disaster recovery drill
- [ ] Performance review
- [ ] Security assessment
- [ ] Update documentation
- [ ] Review and update IAM policies

### Annually
- [ ] Full security audit
- [ ] Compliance review (if applicable)
- [ ] Cost optimization review
- [ ] Backup strategy review
- [ ] Update disaster recovery plan

## Rollback Plan

If deployment fails or critical issues arise:

1. **Immediate Actions**
   - [ ] Stop new uploads
   - [ ] Notify team
   - [ ] Assess impact

2. **Rollback Steps**
   - [ ] Revert code to previous version
   - [ ] Switch to local storage (if S3 unavailable)
   - [ ] Restore from backup (if data corruption)
   - [ ] Update environment variables

3. **Post-Rollback**
   - [ ] Verify system functionality
   - [ ] Notify stakeholders
   - [ ] Root cause analysis
   - [ ] Document incident

## Success Criteria

- [ ] All files uploaded successfully to S3
- [ ] Presigned URLs work correctly
- [ ] Encryption verified
- [ ] No security vulnerabilities
- [ ] Performance meets SLAs
  - Upload: <5 seconds for 5MB file
  - Presigned URL generation: <500ms
  - Download: <2 seconds for 5MB file
- [ ] Cost within budget
- [ ] Monitoring and alerts functional
- [ ] Backup and restore tested
- [ ] Documentation complete
- [ ] Team trained

## Estimated Timeline

- **Phase 1**: 0.5 days
- **Phase 2**: 1 day
- **Phase 3**: 0.5 days
- **Phase 4**: 2 days
- **Phase 5**: 0.5 days
- **Phase 6**: 1.5 days
- **Phase 7**: 1 day
- **Phase 8**: 1 day
- **Phase 9**: 1.5 days
- **Phase 10**: 1 day
- **Phase 11**: 1.5 days
- **Phase 12**: 1.5 days

**Total Estimated Time**: 14-16 business days (2.5-3 weeks)

With dedicated resources and parallel work: 8-10 business days (1.5-2 weeks)

## Resources Required

- **Backend Developer**: 1 person, full-time
- **DevOps Engineer**: 1 person, 50% time (AWS setup, monitoring)
- **QA Engineer**: 1 person, 50% time (testing)
- **Security Engineer**: 1 person, 25% time (security review)

## Contact and Support

- **Technical Lead**: [Name]
- **DevOps Lead**: [Name]
- **Security Lead**: [Name]
- **AWS Support**: [Plan level and contact]

## Notes

- This checklist assumes familiarity with AWS, NestJS, and TypeScript
- Times are estimates and may vary based on team experience
- Some tasks can be done in parallel
- Security and testing should not be rushed
- Document all decisions and changes
