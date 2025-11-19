import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PromptManagerService } from './prompt-manager.service';
import { AIPrompt } from '../entities/ai-prompt.entity';
import { NotFoundException } from '@nestjs/common';

describe('PromptManagerService', () => {
  let service: PromptManagerService;
  let repository: jest.Mocked<Repository<AIPrompt>>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptManagerService,
        {
          provide: getRepositoryToken(AIPrompt),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PromptManagerService>(PromptManagerService);
    repository = module.get(getRepositoryToken(AIPrompt));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPrompt', () => {
    it('should encrypt system prompt before saving', async () => {
      const dto = {
        session_type: 'reference_coach',
        system_prompt: 'You are a professional reference coach',
        model_preference: 'claude-3-5-sonnet-20241022',
      };

      repository.find.mockResolvedValue([]);
      repository.create.mockReturnValue({} as any);
      repository.save.mockResolvedValue({
        id: 'prompt-123',
        ...dto,
        system_prompt_encrypted: 'encrypted-data',
      } as any);

      const result = await service.createPrompt(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_type: dto.session_type,
          system_prompt_encrypted: expect.any(String),
        }),
      );
    });

    it('should deactivate existing prompts when creating new one', async () => {
      const dto = {
        session_type: 'reference_coach',
        system_prompt: 'Updated prompt',
      };

      const existingPrompts = [
        { id: 'prompt-1', version: 1, session_type: 'reference_coach' },
      ];

      repository.find.mockResolvedValue(existingPrompts as any);
      repository.create.mockReturnValue({} as any);
      repository.save.mockResolvedValue({} as any);

      await service.createPrompt(dto);

      expect(repository.update).toHaveBeenCalledWith(
        { session_type: 'reference_coach' },
        { is_active: false },
      );
    });
  });

  describe('getPromptForSessionType', () => {
    it('should return active prompt for session type', async () => {
      const mockPrompt = {
        id: 'prompt-123',
        session_type: 'reference_coach',
        is_active: true,
      };

      repository.findOne.mockResolvedValue(mockPrompt as any);

      const result = await service.getPromptForSessionType('reference_coach');

      expect(result).toEqual(mockPrompt);
    });

    it('should throw NotFoundException if no active prompt exists', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getPromptForSessionType('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt system prompt correctly', async () => {
      const originalPrompt = 'You are a professional reference coach';

      const dto = {
        session_type: 'reference_coach',
        system_prompt: originalPrompt,
      };

      let savedPrompt: any;

      repository.find.mockResolvedValue([]);
      repository.create.mockImplementation((data) => data as any);
      repository.save.mockImplementation((prompt) => {
        savedPrompt = prompt;
        return Promise.resolve({ ...prompt, id: 'prompt-123' } as any);
      });

      await service.createPrompt(dto);

      // Encrypted prompt should not equal original
      expect(savedPrompt.system_prompt_encrypted).not.toBe(originalPrompt);

      // Decrypt and verify
      repository.findOne.mockResolvedValue(savedPrompt);
      const decrypted = await service.getDecryptedPrompt('prompt-123');

      expect(decrypted).toBe(originalPrompt);
    });
  });
});
