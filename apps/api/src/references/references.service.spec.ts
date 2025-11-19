import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { Reference, ReferenceStatus, ReferenceFormat } from '../database/entities';
import { SubmitReferenceDto } from './dto/submit-reference.dto';

describe('ReferencesService', () => {
  let service: ReferencesService;
  let referenceRepository: jest.Mocked<Repository<Reference>>;

  const mockReferenceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferencesService,
        {
          provide: getRepositoryToken(Reference),
          useValue: mockReferenceRepository,
        },
      ],
    }).compile();

    service = module.get<ReferencesService>(ReferencesService);
    referenceRepository = module.get(getRepositoryToken(Reference));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReference', () => {
    const referenceId = 'reference-123';
    const mockReference = {
      id: referenceId,
      seekerId: 'seeker-123',
      referrerId: 'referrer-456',
      status: ReferenceStatus.COMPLETED,
      rcsScore: 85,
      format: 'video',
      seeker: {
        id: 'seeker-123',
        firstName: 'John',
        lastName: 'Doe',
      },
      referrer: {
        id: 'referrer-456',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    };

    it('should return reference when it exists', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);

      const result = await service.getReference(referenceId);

      expect(referenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: referenceId },
        relations: ['seeker', 'referrer'],
      });
      expect(result).toEqual({
        id: mockReference.id,
        seekerId: mockReference.seekerId,
        referrerId: mockReference.referrerId,
        status: mockReference.status,
        rcsScore: mockReference.rcsScore,
        format: mockReference.format,
      });
    });

    it('should throw NotFoundException when reference does not exist', async () => {
      referenceRepository.findOne.mockResolvedValue(null);

      try {
        await service.getReference(referenceId);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(referenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: referenceId },
        relations: ['seeker', 'referrer'],
      });
    });

    it('should include relations when fetching reference', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);

      await service.getReference(referenceId);

      const findOneCall = referenceRepository.findOne.mock.calls[0][0];
      expect(findOneCall).toHaveProperty('relations');
      expect(findOneCall.relations).toEqual(['seeker', 'referrer']);
    });
  });

  describe('submitReference', () => {
    const referenceId = 'reference-123';
    const submitDto: SubmitReferenceDto = {
      format: ReferenceFormat.VIDEO,
      content: 'https://example.com/video.mp4',
      attachments: ['https://example.com/doc1.pdf', 'https://example.com/doc2.pdf'],
    };

    const mockReference = {
      id: referenceId,
      seekerId: 'seeker-123',
      referrerId: 'referrer-456',
      status: ReferenceStatus.PENDING,
      format: null,
      contentUrl: null,
      attachments: null,
      rcsScore: null,
      submittedAt: null,
    };

    it('should successfully submit a reference', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);

      // Mock Math.random to return a predictable value
      jest.spyOn(Math, 'random').mockReturnValue(0.85);

      const expectedRcsScore = Math.floor(0.85 * 100);

      const savedReference = {
        ...mockReference,
        format: submitDto.format,
        contentUrl: submitDto.content,
        attachments: submitDto.attachments,
        status: ReferenceStatus.COMPLETED,
        rcsScore: expectedRcsScore,
        submittedAt: new Date(),
      };
      referenceRepository.save.mockResolvedValue(savedReference as any);

      const result = await service.submitReference(referenceId, submitDto);

      expect(referenceRepository.findOne).toHaveBeenCalledWith({ where: { id: referenceId } });
      const saveCall = referenceRepository.save.mock.calls[0][0];
      expect(saveCall.format).toBe(submitDto.format);
      expect(saveCall.contentUrl).toBe(submitDto.content);
      expect(saveCall.attachments).toEqual(submitDto.attachments);
      expect(saveCall.status).toBe(ReferenceStatus.COMPLETED);
      expect(saveCall.rcsScore).toBe(expectedRcsScore);
      expect(saveCall.submittedAt).toBeInstanceOf(Date);
      expect(result).toEqual({
        referenceId: mockReference.id,
        rcsScore: expectedRcsScore,
      });

      jest.restoreAllMocks();
    });

    it('should throw NotFoundException when reference does not exist', async () => {
      referenceRepository.findOne.mockResolvedValue(null);

      try {
        await service.submitReference(referenceId, submitDto);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(referenceRepository.findOne).toHaveBeenCalledWith({ where: { id: referenceId } });
      expect(referenceRepository.save).not.toHaveBeenCalled();
    });

    it('should update status to COMPLETED', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);
      referenceRepository.save.mockResolvedValue({
        ...mockReference,
        status: ReferenceStatus.COMPLETED,
      } as any);

      await service.submitReference(referenceId, submitDto);

      const saveCall = referenceRepository.save.mock.calls[0][0];
      expect(saveCall.status).toBe(ReferenceStatus.COMPLETED);
    });

    it('should set submittedAt timestamp', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      await service.submitReference(referenceId, submitDto);

      const saveCall = referenceRepository.save.mock.calls[0][0];
      expect(saveCall.submittedAt).toBeInstanceOf(Date);
    });

    it('should handle null attachments', async () => {
      const submitDtoNoAttachments: SubmitReferenceDto = {
        format: ReferenceFormat.TEXT,
        content: 'Great reference!',
      };

      referenceRepository.findOne.mockResolvedValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      await service.submitReference(referenceId, submitDtoNoAttachments);

      const saveCall = referenceRepository.save.mock.calls[0][0];
      expect(saveCall.attachments).toBeNull();
    });

    it('should generate RCS score between 0 and 100', async () => {
      referenceRepository.findOne.mockResolvedValue(mockReference as any);
      referenceRepository.save.mockResolvedValue(mockReference as any);

      // Test multiple times to ensure score is in range
      for (let i = 0; i < 10; i++) {
        const result = await service.submitReference(referenceId, submitDto);
        expect(result.rcsScore).toBeGreaterThanOrEqual(0);
        expect(result.rcsScore).toBeLessThan(100);
      }
    });
  });
});
