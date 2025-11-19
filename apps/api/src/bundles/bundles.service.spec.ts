import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BundlesService } from './bundles.service';
import { Bundle, Reference } from '../database/entities';
import { CreateBundleDto } from './dto/create-bundle.dto';

describe('BundlesService', () => {
  let service: BundlesService;
  let bundleRepository: jest.Mocked<Repository<Bundle>>;
  let referenceRepository: jest.Mocked<Repository<Reference>>;

  const mockBundleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockReferenceRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BundlesService,
        {
          provide: getRepositoryToken(Bundle),
          useValue: mockBundleRepository,
        },
        {
          provide: getRepositoryToken(Reference),
          useValue: mockReferenceRepository,
        },
      ],
    }).compile();

    service = module.get<BundlesService>(BundlesService);
    bundleRepository = module.get(getRepositoryToken(Bundle));
    referenceRepository = module.get(getRepositoryToken(Reference));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBundle', () => {
    const seekerId = 'seeker-123';
    const createBundleDto: CreateBundleDto = {
      title: 'My Professional References',
      description: 'References for job application',
      referenceIds: ['ref-1', 'ref-2', 'ref-3'],
      password: 'secure123',
      expiryDate: '2025-12-31',
    };

    const mockReferences = [
      {
        id: 'ref-1',
        seekerId: seekerId,
        rcsScore: 85,
      },
      {
        id: 'ref-2',
        seekerId: seekerId,
        rcsScore: 90,
      },
      {
        id: 'ref-3',
        seekerId: seekerId,
        rcsScore: 95,
      },
    ];

    it('should successfully create a bundle', async () => {
      referenceRepository.find.mockResolvedValue(mockReferences as any);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword' as never));

      const mockBundle = {
        id: 'bundle-123',
        seekerId,
        title: createBundleDto.title,
        description: createBundleDto.description,
        shareLink: 'https://deepref.ai/bundles/abc123',
        password: 'hashedPassword',
        aggregatedRCS: 90,
        expiryDate: new Date(createBundleDto.expiryDate!),
      };

      bundleRepository.create.mockReturnValue(mockBundle as any);
      bundleRepository.save.mockResolvedValue(mockBundle as any);

      const result = await service.createBundle(seekerId, createBundleDto);

      expect(referenceRepository.find).toHaveBeenCalledWith({
        where: {
          id: In(createBundleDto.referenceIds),
          seekerId,
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createBundleDto.password, 10);
      expect(bundleRepository.create).toHaveBeenCalled();
      expect(bundleRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        bundleId: mockBundle.id,
        shareLink: mockBundle.shareLink,
      });
    });

    it('should throw NotFoundException when some references are not found', async () => {
      // Return only 2 out of 3 references
      referenceRepository.find.mockResolvedValue([mockReferences[0], mockReferences[1]] as any);

      try {
        await service.createBundle(seekerId, createBundleDto);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(bundleRepository.create).not.toHaveBeenCalled();
    });

    it('should calculate correct aggregated RCS score', async () => {
      referenceRepository.find.mockResolvedValue(mockReferences as any);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword' as never));

      const expectedAverage = (85 + 90 + 95) / 3; // 90

      bundleRepository.create.mockReturnValue({
        id: 'bundle-123',
        shareLink: 'https://deepref.ai/bundles/abc123',
      } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, createBundleDto);

      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.aggregatedRCS).toBe(expectedAverage);
    });

    it('should handle null RCS scores in references', async () => {
      const referencesWithNulls = [
        { id: 'ref-1', seekerId, rcsScore: null },
        { id: 'ref-2', seekerId, rcsScore: 80 },
      ];

      referenceRepository.find.mockResolvedValue(referencesWithNulls as any);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword' as never));

      bundleRepository.create.mockReturnValue({
        id: 'bundle-123',
        shareLink: 'https://deepref.ai/bundles/abc123',
      } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, { ...createBundleDto, referenceIds: ['ref-1', 'ref-2'] });

      // Should calculate average treating null as 0
      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.aggregatedRCS).toBe(40); // (0 + 80) / 2
    });

    it('should hash password when provided', async () => {
      referenceRepository.find.mockResolvedValue(mockReferences as any);
      const hashedPassword = 'hashedPassword123';
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword as never));

      bundleRepository.create.mockReturnValue({ id: 'bundle-123' } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, createBundleDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createBundleDto.password, 10);
      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.password).toBe(hashedPassword);
    });

    it('should set password to null when not provided', async () => {
      const dtoWithoutPassword = { ...createBundleDto, password: undefined };
      referenceRepository.find.mockResolvedValue(mockReferences as any);

      bundleRepository.create.mockReturnValue({ id: 'bundle-123' } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, dtoWithoutPassword);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.password).toBeNull();
    });

    it('should generate unique share links', async () => {
      referenceRepository.find.mockResolvedValue(mockReferences as any);

      const bundle1 = { id: 'bundle-1', shareLink: 'link1' };
      const bundle2 = { id: 'bundle-2', shareLink: 'link2' };

      bundleRepository.create
        .mockReturnValueOnce(bundle1 as any)
        .mockReturnValueOnce(bundle2 as any);
      bundleRepository.save
        .mockResolvedValueOnce(bundle1 as any)
        .mockResolvedValueOnce(bundle2 as any);

      const result1 = await service.createBundle(seekerId, createBundleDto);
      const result2 = await service.createBundle(seekerId, createBundleDto);

      // Share codes should be different
      expect(result1.shareLink).not.toEqual(result2.shareLink);
    });

    it('should handle optional expiry date', async () => {
      const dtoWithoutExpiry = { ...createBundleDto, expiryDate: undefined };
      referenceRepository.find.mockResolvedValue(mockReferences as any);

      bundleRepository.create.mockReturnValue({ id: 'bundle-123' } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, dtoWithoutExpiry);

      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.expiryDate).toBeNull();
    });

    it('should handle empty references list', async () => {
      const dtoWithEmptyRefs = { ...createBundleDto, referenceIds: [] };
      referenceRepository.find.mockResolvedValue([]);

      bundleRepository.create.mockReturnValue({ id: 'bundle-123' } as any);
      bundleRepository.save.mockResolvedValue({ id: 'bundle-123' } as any);

      await service.createBundle(seekerId, dtoWithEmptyRefs);

      const createCall = bundleRepository.create.mock.calls[0][0];
      expect(createCall.aggregatedRCS).toBe(0);
    });
  });

  describe('getBundle', () => {
    const bundleId = 'bundle-123';
    const mockBundle = {
      id: bundleId,
      title: 'My Professional References',
      aggregatedRCS: 90,
      references: [
        { id: 'ref-1', rcsScore: 85 },
        { id: 'ref-2', rcsScore: 95 },
      ],
      seeker: {
        id: 'seeker-123',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should return bundle when it exists', async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle as any);

      const result = await service.getBundle(bundleId);

      expect(bundleRepository.findOne).toHaveBeenCalledWith({
        where: { id: bundleId },
        relations: ['references', 'seeker'],
      });
      expect(result).toEqual({
        id: mockBundle.id,
        title: mockBundle.title,
        aggregatedRCS: mockBundle.aggregatedRCS,
        references: mockBundle.references,
      });
    });

    it('should throw NotFoundException when bundle does not exist', async () => {
      bundleRepository.findOne.mockResolvedValue(null);

      try {
        await service.getBundle(bundleId);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
      expect(bundleRepository.findOne).toHaveBeenCalledWith({
        where: { id: bundleId },
        relations: ['references', 'seeker'],
      });
    });

    it('should include relations when fetching bundle', async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle as any);

      await service.getBundle(bundleId);

      const findOneCall = bundleRepository.findOne.mock.calls[0][0];
      expect(findOneCall).toHaveProperty('relations');
      expect(findOneCall.relations).toEqual(['references', 'seeker']);
    });

    it('should return empty references array when no references attached', async () => {
      const bundleWithoutRefs = { ...mockBundle, references: null };
      bundleRepository.findOne.mockResolvedValue(bundleWithoutRefs as any);

      const result = await service.getBundle(bundleId);

      expect(result.references).toEqual([]);
    });
  });
});
