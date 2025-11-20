#!/bin/bash

# AWS S3 Setup Script for DeepRef
# This script automates the setup of S3 buckets, IAM policies, and configurations
# Usage: ./setup.sh [environment]
# Example: ./setup.sh production

set -e

# Configuration
ENVIRONMENT=${1:-production}
BUCKET_NAME="deepref-uploads-${ENVIRONMENT}"
BACKUP_BUCKET_NAME="deepref-uploads-backup-${ENVIRONMENT}"
REGION="us-east-1"
BACKUP_REGION="eu-west-1"
IAM_USER="deepref-s3-uploader-${ENVIRONMENT}"
IAM_POLICY_NAME="DeepRefS3UploaderPolicy-${ENVIRONMENT}"

echo "========================================="
echo "DeepRef S3 Setup - ${ENVIRONMENT}"
echo "========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "Step 1: Creating S3 buckets..."
echo "-------------------------------"

# Create primary bucket
if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating bucket: ${BUCKET_NAME}"
    aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
else
    echo "Bucket already exists: ${BUCKET_NAME}"
fi

# Create backup bucket
if aws s3 ls "s3://${BACKUP_BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating backup bucket: ${BACKUP_BUCKET_NAME}"
    aws s3 mb "s3://${BACKUP_BUCKET_NAME}" --region "${BACKUP_REGION}"
else
    echo "Backup bucket already exists: ${BACKUP_BUCKET_NAME}"
fi

echo ""
echo "Step 2: Blocking public access..."
echo "----------------------------------"

aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-public-access-block \
    --bucket "${BACKUP_BUCKET_NAME}" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✓ Public access blocked on both buckets"

echo ""
echo "Step 3: Enabling versioning..."
echo "-------------------------------"

aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
    --bucket "${BACKUP_BUCKET_NAME}" \
    --versioning-configuration Status=Enabled

echo "✓ Versioning enabled on both buckets"

echo ""
echo "Step 4: Configuring encryption..."
echo "----------------------------------"

aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'

aws s3api put-bucket-encryption \
    --bucket "${BACKUP_BUCKET_NAME}" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'

echo "✓ Encryption enabled on both buckets (SSE-S3 with Bucket Keys)"

echo ""
echo "Step 5: Applying bucket policy..."
echo "----------------------------------"

# Update bucket policy with actual bucket name
cat s3-bucket-policy.json | sed "s/deepref-uploads-production/${BUCKET_NAME}/g" > /tmp/bucket-policy.json

aws s3api put-bucket-policy \
    --bucket "${BUCKET_NAME}" \
    --policy file:///tmp/bucket-policy.json

echo "✓ Bucket policy applied"

echo ""
echo "Step 6: Applying lifecycle policy..."
echo "-------------------------------------"

aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET_NAME}" \
    --lifecycle-configuration file://lifecycle-policy.json

echo "✓ Lifecycle policy applied"

echo ""
echo "Step 7: Configuring CORS..."
echo "---------------------------"

aws s3api put-bucket-cors \
    --bucket "${BUCKET_NAME}" \
    --cors-configuration file://cors-policy.json

echo "✓ CORS policy applied"

echo ""
echo "Step 8: Creating IAM user and policy..."
echo "----------------------------------------"

# Create IAM user
if aws iam get-user --user-name "${IAM_USER}" &> /dev/null; then
    echo "IAM user already exists: ${IAM_USER}"
else
    echo "Creating IAM user: ${IAM_USER}"
    aws iam create-user --user-name "${IAM_USER}"
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update IAM policy with actual bucket names
cat iam-policy.json | sed "s/deepref-uploads-production/${BUCKET_NAME}/g" > /tmp/iam-policy.json

# Create or update IAM policy
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${IAM_POLICY_NAME}"

if aws iam get-policy --policy-arn "${POLICY_ARN}" &> /dev/null; then
    echo "Updating IAM policy: ${IAM_POLICY_NAME}"

    # Create new policy version
    aws iam create-policy-version \
        --policy-arn "${POLICY_ARN}" \
        --policy-document file:///tmp/iam-policy.json \
        --set-as-default
else
    echo "Creating IAM policy: ${IAM_POLICY_NAME}"
    aws iam create-policy \
        --policy-name "${IAM_POLICY_NAME}" \
        --policy-document file:///tmp/iam-policy.json
fi

# Attach policy to user
aws iam attach-user-policy \
    --user-name "${IAM_USER}" \
    --policy-arn "${POLICY_ARN}"

echo "✓ IAM policy created and attached"

echo ""
echo "Step 9: Creating access keys..."
echo "--------------------------------"

# Check if access keys already exist
KEY_COUNT=$(aws iam list-access-keys --user-name "${IAM_USER}" --query 'AccessKeyMetadata | length(@)' --output text)

if [ "$KEY_COUNT" -ge 2 ]; then
    echo "⚠ User already has maximum number of access keys (2)"
    echo "Please delete an existing key before creating a new one"
else
    echo "Creating access keys for: ${IAM_USER}"
    ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "${IAM_USER}")

    ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

    echo ""
    echo "========================================="
    echo "⚠ IMPORTANT: Save these credentials securely!"
    echo "========================================="
    echo "AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}"
    echo "AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}"
    echo ""
    echo "Add these to your .env file:"
    echo "AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}"
    echo "AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}"
    echo "AWS_S3_BUCKET=${BUCKET_NAME}"
    echo "AWS_REGION=${REGION}"
    echo ""
    echo "⚠ This is the only time the secret key will be shown!"
    echo "========================================="
fi

echo ""
echo "Step 10: Setting up cross-region replication..."
echo "------------------------------------------------"

# Note: This requires additional permissions and configuration
echo "ℹ Cross-region replication setup requires additional steps."
echo "See docs/AWS_S3_SETUP.md for detailed instructions."

echo ""
echo "========================================="
echo "✓ Setup Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "--------"
echo "Primary Bucket: ${BUCKET_NAME} (${REGION})"
echo "Backup Bucket: ${BACKUP_BUCKET_NAME} (${BACKUP_REGION})"
echo "IAM User: ${IAM_USER}"
echo "IAM Policy: ${IAM_POLICY_NAME}"
echo ""
echo "Next Steps:"
echo "1. Save the access keys to your .env file"
echo "2. Generate encryption key: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo "3. Add FILE_ENCRYPTION_KEY to your .env file"
echo "4. Run npm install to install AWS SDK dependencies"
echo "5. Test the integration with: npm test -- storage.service.spec.ts"
echo ""
echo "Documentation:"
echo "- Setup Guide: docs/AWS_S3_SETUP.md"
echo "- Storage README: docs/STORAGE_README.md"
echo "- Implementation Checklist: docs/S3_IMPLEMENTATION_CHECKLIST.md"
echo ""

# Cleanup temporary files
rm -f /tmp/bucket-policy.json /tmp/iam-policy.json
