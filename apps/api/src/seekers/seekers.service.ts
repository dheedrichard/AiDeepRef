import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Reference, KYCDocument } from '../database/entities';
import { CreateReferenceRequestDto } from './dto/create-reference-request.dto';
import { ReferenceStatus } from '../database/entities';

@Injectable()
export class SeekersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>,
    @InjectRepository(KYCDocument)
    private kycDocumentRepository: Repository<KYCDocument>,
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

  async uploadKycDocument(userId: string, documentType: string, files: unknown) {
    // TODO: Implement file upload to cloud storage
    // TODO: Trigger KYC verification process

    const uploadId = `upload_${Date.now()}`;

    return {
      uploadId,
      status: 'processing',
    };
  }

  async uploadSelfie(userId: string, file: unknown) {
    // TODO: Implement selfie upload
    // TODO: Trigger liveness check

    const verificationId = `verification_${Date.now()}`;

    return {
      verificationId,
      status: 'processing',
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
