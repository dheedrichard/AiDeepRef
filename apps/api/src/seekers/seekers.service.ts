import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Reference, KYCDocument, KYCStatus } from '../database/entities';
import { DocumentType, VerificationStatus } from '../database/entities/kyc-document.entity';
import { CreateReferenceRequestDto } from './dto/create-reference-request.dto';
import { ReferenceStatus } from '../database/entities';
import { StorageService } from '../common/services/storage.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class SeekersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>,
    @InjectRepository(KYCDocument)
    private kycDocumentRepository: Repository<KYCDocument>,
    private storageService: StorageService,
    private emailService: EmailService,
  ) {}

  async getProfile(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Seeker not found');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      kycStatus: user.kycStatus,
    };
  }

  async uploadKycDocument(
    userId: string,
    documentType: string,
    files: { frontImage?: Express.Multer.File[]; backImage?: Express.Multer.File[] },
  ) {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate files
    if (!files.frontImage || files.frontImage.length === 0) {
      throw new BadRequestException('Front image is required');
    }

    const frontImage = files.frontImage[0];
    const backImage = files.backImage?.[0];

    // Validate file types and sizes
    const validation = this.storageService.validateFile(frontImage, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    if (backImage) {
      const backValidation = this.storageService.validateFile(backImage, {
        maxSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      });

      if (!backValidation.valid) {
        throw new BadRequestException(backValidation.error);
      }
    }

    // Upload files to storage
    const frontImageResult = await this.storageService.uploadFile(frontImage, 'kyc');
    const backImageResult = backImage
      ? await this.storageService.uploadFile(backImage, 'kyc')
      : null;

    // Create KYC document record
    const kycDocument = this.kycDocumentRepository.create({
      userId,
      documentType: documentType as DocumentType,
      frontImageUrl: frontImageResult.url,
      backImageUrl: backImageResult?.url || null,
      status: VerificationStatus.PROCESSING,
    });

    const savedDocument = await this.kycDocumentRepository.save(kycDocument);

    // Update user KYC status to processing
    user.kycStatus = KYCStatus.PENDING;
    await this.userRepository.save(user);

    // TODO: Trigger AI verification service (stub for now)
    // In production, this would call an AI service to verify the document
    // await this.aiService.verifyDocument(savedDocument.id);

    return {
      uploadId: savedDocument.id,
      status: 'processing',
    };
  }

  async uploadSelfie(
    userId: string,
    files: { selfieImage?: Express.Multer.File[] },
  ) {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate file
    if (!files.selfieImage || files.selfieImage.length === 0) {
      throw new BadRequestException('Selfie image is required');
    }

    const selfieImage = files.selfieImage[0];

    // Validate file type and size
    const validation = this.storageService.validateFile(selfieImage, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Upload file to storage
    const selfieResult = await this.storageService.uploadFile(selfieImage, 'kyc/selfies');

    // Find existing KYC document for this user
    const kycDocument = await this.kycDocumentRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!kycDocument) {
      throw new BadRequestException('Please upload ID document first');
    }

    // Update KYC document with selfie
    kycDocument.selfieImageUrl = selfieResult.url;
    await this.kycDocumentRepository.save(kycDocument);

    // TODO: Trigger liveness detection service (stub for now)
    // In production, this would call an AI service for liveness detection
    // const livenessScore = await this.aiService.detectLiveness(selfieResult.url, kycDocument.frontImageUrl);
    // kycDocument.livenessScore = livenessScore;

    // Simulate verification completion (in production, this would be done by AI service)
    kycDocument.status = VerificationStatus.VERIFIED;
    kycDocument.livenessScore = 0.95; // Mock score
    await this.kycDocumentRepository.save(kycDocument);

    // Update user KYC status
    user.kycStatus = KYCStatus.VERIFIED;
    await this.userRepository.save(user);

    // Send email notification
    await this.emailService.sendKycStatusEmail(user.email, 'verified');

    return {
      verificationId: kycDocument.id,
      status: 'verified',
    };
  }

  async getKycStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      kycStatus: user.kycStatus,
    };
  }

  async createReferenceRequest(seekerId: string, dto: CreateReferenceRequestDto) {
    const seeker = await this.userRepository.findOne({ where: { id: seekerId } });
    if (!seeker) {
      throw new NotFoundException('Seeker not found');
    }

    // TODO: Create or find referrer user
    // For now, we'll create the reference without a referrer ID
    const reference = this.referenceRepository.create({
      seekerId,
      referrerId: seekerId, // Placeholder - should be actual referrer ID
      referrerName: dto.referrerName,
      referrerEmail: dto.referrerEmail,
      company: dto.company,
      role: dto.role,
      questions: dto.questions,
      allowedFormats: dto.allowedFormats,
      allowEmployerReachback: dto.allowEmployerReachback,
      status: ReferenceStatus.PENDING,
    });

    const savedReference = await this.referenceRepository.save(reference);

    // TODO: Send email notification to referrer

    return {
      requestId: savedReference.id,
      status: 'sent',
    };
  }
}
