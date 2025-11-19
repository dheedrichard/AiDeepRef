import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SeekersService } from './seekers.service';
import { User, Reference, KYCDocument, UserRole, ReferenceStatus, KYCStatus, ReferenceFormat } from '../database/entities';
import { CreateReferenceRequestDto } from './dto/create-reference-request.dto';

describe('SeekersService', () => {
  let service: SeekersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let referenceRepository: jest.Mocked<Repository<Reference>>;
  let kycDocumentRepository: jest.Mocked<Repository<KYCDocument>>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockReferenceRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockKycDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeekersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Reference),
          useValue: mockReferenceRepository,
        },
        {
          provide: getRepositoryToken(KYCDocument),
          useValue: mockKycDocumentRepository,
        },
      ],
    }).compile();

    service = module.get<SeekersService>(SeekersService);
    userRepository = module.get(getRepositoryToken(User));
    referenceRepository = module.get(getRepositoryToken(Reference));
    kycDocumentRepository = module.get(getRepositoryToken(KYCDocument));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      kycStatus: KYCStatus.PENDING,
      role: UserRole.SEEKER,
    };

    it('should return user profile when user exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.getProfile(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        kycStatus: mockUser.kycStatus,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      try {
        await service.getProfile(userId);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });
  });

  describe('uploadKycDocument', () => {
    const userId = 'user-123';
    const documentType = 'passport';
    const mockFiles: any = { frontImage: [], backImage: [] };

    it('should return upload status for KYC document', async () => {
      const mockDate = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);

      const result = await service.uploadKycDocument(userId, documentType, mockFiles);

      expect(result).toEqual({
        uploadId: `upload_${mockDate}`,
        status: 'processing',
      });

      jest.restoreAllMocks();
    });

    it('should generate unique upload IDs', async () => {
      const mockFiles1: any = { frontImage: [], backImage: [] };
      const result1 = await service.uploadKycDocument(userId, documentType, mockFiles1);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockFiles2: any = { frontImage: [], backImage: [] };
      const result2 = await service.uploadKycDocument(userId, documentType, mockFiles2);

      expect(result1.uploadId).not.toEqual(result2.uploadId);
      expect(result1.status).toBe('processing');
      expect(result2.status).toBe('processing');
    });
  });

  describe('uploadSelfie', () => {
    const userId = 'user-123';
    const mockFile: any = {};

    it('should return verification status for selfie upload', async () => {
      const mockDate = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);

      const result = await service.uploadSelfie(userId, mockFile);

      expect(result).toEqual({
        verificationId: `verification_${mockDate}`,
        status: 'processing',
      });

      jest.restoreAllMocks();
    });

    it('should generate unique verification IDs', async () => {
      const result1 = await service.uploadSelfie(userId, mockFile);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadSelfie(userId, mockFile);

      expect(result1.verificationId).not.toEqual(result2.verificationId);
      expect(result1.status).toBe('processing');
      expect(result2.status).toBe('processing');
    });
  });

  describe('createReferenceRequest', () => {
    const seekerId = 'seeker-123';
    const createReferenceDto: CreateReferenceRequestDto = {
      referrerName: 'Jane Smith',
      referrerEmail: 'jane@example.com',
      company: 'Tech Corp',
      role: 'Senior Developer',
      questions: ['How was their performance?', 'Would you hire them again?'],
      allowedFormats: [ReferenceFormat.VIDEO, ReferenceFormat.TEXT],
      allowEmployerReachback: true,
    };

    const mockSeeker = {
      id: seekerId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: UserRole.SEEKER,
    };

    const mockReference = {
      id: 'reference-123',
      seekerId,
      referrerId: seekerId,
      referrerName: createReferenceDto.referrerName,
      referrerEmail: createReferenceDto.referrerEmail,
      company: createReferenceDto.company,
      role: createReferenceDto.role,
      questions: createReferenceDto.questions,
      allowedFormats: createReferenceDto.allowedFormats,
      allowEmployerReachback: createReferenceDto.allowEmployerReachback,
      status: ReferenceStatus.PENDING,
    };

    it('should successfully create a reference request', async () => {
      userRepository.findOne.mockResolvedValue(mockSeeker as any);
      referenceRepository.create.mockReturnValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      const result = await service.createReferenceRequest(seekerId, createReferenceDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: seekerId } });
      expect(referenceRepository.create).toHaveBeenCalledWith({
        seekerId,
        referrerId: seekerId, // Placeholder
        referrerName: createReferenceDto.referrerName,
        referrerEmail: createReferenceDto.referrerEmail,
        company: createReferenceDto.company,
        role: createReferenceDto.role,
        questions: createReferenceDto.questions,
        allowedFormats: createReferenceDto.allowedFormats,
        allowEmployerReachback: createReferenceDto.allowEmployerReachback,
        status: ReferenceStatus.PENDING,
      });
      expect(referenceRepository.save).toHaveBeenCalledWith(mockReference);
      expect(result).toEqual({
        requestId: mockReference.id,
        status: 'sent',
      });
    });

    it('should throw NotFoundException when seeker does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      try {
        await service.createReferenceRequest(seekerId, createReferenceDto);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: seekerId } });
      expect(referenceRepository.create).not.toHaveBeenCalled();
    });

    it('should create reference with all provided fields', async () => {
      userRepository.findOne.mockResolvedValue(mockSeeker as any);
      referenceRepository.create.mockReturnValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      await service.createReferenceRequest(seekerId, createReferenceDto);

      const createCall = referenceRepository.create.mock.calls[0][0];
      expect(createCall.seekerId).toBe(seekerId);
      expect(createCall.referrerName).toBe(createReferenceDto.referrerName);
      expect(createCall.referrerEmail).toBe(createReferenceDto.referrerEmail);
      expect(createCall.company).toBe(createReferenceDto.company);
      expect(createCall.role).toBe(createReferenceDto.role);
      expect(createCall.questions).toEqual(createReferenceDto.questions);
      expect(createCall.allowedFormats).toEqual(createReferenceDto.allowedFormats);
      expect(createCall.allowEmployerReachback).toBe(createReferenceDto.allowEmployerReachback);
      expect(createCall.status).toBe(ReferenceStatus.PENDING);
    });

    it('should set status to PENDING for new reference requests', async () => {
      userRepository.findOne.mockResolvedValue(mockSeeker as any);
      referenceRepository.create.mockReturnValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      await service.createReferenceRequest(seekerId, createReferenceDto);

      const createCall = referenceRepository.create.mock.calls[0][0];
      expect(createCall.status).toBe(ReferenceStatus.PENDING);
    });
  });
});
