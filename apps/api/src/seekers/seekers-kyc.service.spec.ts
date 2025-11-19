import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SeekersService } from './seekers.service';
import { User, Reference, KYCDocument, UserRole, ReferenceStatus, KYCStatus } from '../database/entities';
import { DocumentType, VerificationStatus } from '../database/entities/kyc-document.entity';
import { StorageService } from '../common/services/storage.service';
import { EmailService } from '../common/services/email.service';

describe('SeekersService - KYC Operations', () => {
  let service: SeekersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let referenceRepository: jest.Mocked<Repository<Reference>>;
  let kycDocumentRepository: jest.Mocked<Repository<KYCDocument>>;
  let storageService: jest.Mocked<StorageService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockReferenceRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockKycDocumentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    validateFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockEmailService = {
    sendKycStatusEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
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
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<SeekersService>(SeekersService);
    userRepository = module.get(getRepositoryToken(User));
    referenceRepository = module.get(getRepositoryToken(Reference));
    kycDocumentRepository = module.get(getRepositoryToken(KYCDocument));
    storageService = module.get(StorageService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadKycDocument', () => {
    const userId = 'user-123';
    const documentType = 'passport';
    const mockFrontImage = {
      originalname: 'passport-front.jpg',
      mimetype: 'image/jpeg',
      size: 1024000,
      buffer: Buffer.from('mock-file-data'),
    } as Express.Multer.File;

    const mockBackImage = {
      originalname: 'passport-back.jpg',
      mimetype: 'image/jpeg',
      size: 1024000,
      buffer: Buffer.from('mock-file-data'),
    } as Express.Multer.File;

    const mockFiles = {
      frontImage: [mockFrontImage],
      backImage: [mockBackImage],
    };

    const mockUser = {
      id: userId,
      kycStatus: KYCStatus.PENDING,
      email: 'user@example.com',
    };

    const mockKycDocument = {
      id: 'kyc-doc-123',
      userId,
      documentType: DocumentType.PASSPORT,
      frontImageUrl: '/uploads/kyc/front.jpg',
      backImageUrl: '/uploads/kyc/back.jpg',
      status: VerificationStatus.PROCESSING,
    };

    it('should successfully upload KYC documents', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile
        .mockResolvedValueOnce({ url: '/uploads/kyc/front.jpg', filename: 'front.jpg', size: 1024, mimetype: 'image/jpeg' })
        .mockResolvedValueOnce({ url: '/uploads/kyc/back.jpg', filename: 'back.jpg', size: 1024, mimetype: 'image/jpeg' });
      kycDocumentRepository.create.mockReturnValue(mockKycDocument as any);
      kycDocumentRepository.save.mockResolvedValue(mockKycDocument as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.uploadKycDocument(userId, documentType, mockFiles);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(storageService.validateFile).toHaveBeenCalledTimes(2);
      expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(kycDocumentRepository.create).toHaveBeenCalled();
      expect(kycDocumentRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        uploadId: mockKycDocument.id,
        status: 'processing',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadKycDocument(userId, documentType, mockFiles)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if front image is missing', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(
        service.uploadKycDocument(userId, documentType, { frontImage: [], backImage: [mockBackImage] })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file validation fails', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({
        valid: false,
        error: 'File too large',
      });

      await expect(service.uploadKycDocument(userId, documentType, mockFiles)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should update user KYC status to pending', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile
        .mockResolvedValueOnce({ url: '/uploads/kyc/front.jpg', filename: 'front.jpg', size: 1024, mimetype: 'image/jpeg' })
        .mockResolvedValueOnce({ url: '/uploads/kyc/back.jpg', filename: 'back.jpg', size: 1024, mimetype: 'image/jpeg' });
      kycDocumentRepository.create.mockReturnValue(mockKycDocument as any);
      kycDocumentRepository.save.mockResolvedValue(mockKycDocument as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      await service.uploadKycDocument(userId, documentType, mockFiles);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          kycStatus: KYCStatus.PENDING,
        })
      );
    });

    it('should work without back image', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile.mockResolvedValueOnce({
        url: '/uploads/kyc/front.jpg',
        filename: 'front.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
      });
      kycDocumentRepository.create.mockReturnValue(mockKycDocument as any);
      kycDocumentRepository.save.mockResolvedValue(mockKycDocument as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.uploadKycDocument(userId, documentType, {
        frontImage: [mockFrontImage],
      });

      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('processing');
    });
  });

  describe('uploadSelfie', () => {
    const userId = 'user-123';
    const mockSelfieImage = {
      originalname: 'selfie.jpg',
      mimetype: 'image/jpeg',
      size: 1024000,
      buffer: Buffer.from('mock-selfie-data'),
    } as Express.Multer.File;

    const mockFiles = {
      selfieImage: [mockSelfieImage],
    };

    const mockUser = {
      id: userId,
      email: 'user@example.com',
      kycStatus: KYCStatus.PENDING,
    };

    const mockKycDocument = {
      id: 'kyc-doc-123',
      userId,
      selfieImageUrl: null,
      status: VerificationStatus.PROCESSING,
    };

    it('should successfully upload selfie and verify user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile.mockResolvedValue({
        url: '/uploads/kyc/selfies/selfie.jpg',
        filename: 'selfie.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
      });
      kycDocumentRepository.findOne.mockResolvedValue(mockKycDocument as any);
      kycDocumentRepository.save.mockResolvedValue({
        ...mockKycDocument,
        status: VerificationStatus.VERIFIED,
        livenessScore: 0.95,
      } as any);
      userRepository.save.mockResolvedValue(mockUser as any);
      emailService.sendKycStatusEmail.mockResolvedValue(true);

      const result = await service.uploadSelfie(userId, mockFiles);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(storageService.validateFile).toHaveBeenCalled();
      expect(storageService.uploadFile).toHaveBeenCalledWith(mockSelfieImage, 'kyc/selfies');
      expect(kycDocumentRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(emailService.sendKycStatusEmail).toHaveBeenCalledWith(mockUser.email, 'verified');
      expect(result).toEqual({
        verificationId: mockKycDocument.id,
        status: 'verified',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadSelfie(userId, mockFiles)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if selfie image is missing', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.uploadSelfie(userId, { selfieImage: [] })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if no KYC document exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile.mockResolvedValue({
        url: '/uploads/kyc/selfies/selfie.jpg',
        filename: 'selfie.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
      });
      kycDocumentRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadSelfie(userId, mockFiles)).rejects.toThrow(BadRequestException);
    });

    it('should update user KYC status to verified', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({ valid: true });
      storageService.uploadFile.mockResolvedValue({
        url: '/uploads/kyc/selfies/selfie.jpg',
        filename: 'selfie.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
      });
      kycDocumentRepository.findOne.mockResolvedValue(mockKycDocument as any);
      kycDocumentRepository.save.mockResolvedValue(mockKycDocument as any);
      userRepository.save.mockResolvedValue(mockUser as any);
      emailService.sendKycStatusEmail.mockResolvedValue(true);

      await service.uploadSelfie(userId, mockFiles);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          kycStatus: KYCStatus.VERIFIED,
        })
      );
    });

    it('should throw BadRequestException if file validation fails', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      storageService.validateFile.mockReturnValue({
        valid: false,
        error: 'Invalid file type',
      });

      await expect(service.uploadSelfie(userId, mockFiles)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getKycStatus', () => {
    const userId = 'user-123';

    it('should return KYC status for existing user', async () => {
      const mockUser = {
        id: userId,
        kycStatus: KYCStatus.VERIFIED,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.getKycStatus(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual({ kycStatus: KYCStatus.VERIFIED });
    });

    it('should return pending status for new users', async () => {
      const mockUser = {
        id: userId,
        kycStatus: KYCStatus.PENDING,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.getKycStatus(userId);

      expect(result).toEqual({ kycStatus: KYCStatus.PENDING });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getKycStatus(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
