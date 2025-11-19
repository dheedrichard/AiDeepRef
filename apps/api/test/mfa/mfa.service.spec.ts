import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MfaService } from '../../src/mfa/services/mfa.service';
import { MfaSettings, MfaMethod } from '../../src/mfa/entities/mfa-settings.entity';
import { MfaChallenge, ChallengeType } from '../../src/mfa/entities/mfa-challenge.entity';
import { User } from '../../src/database/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('MfaService', () => {
  let service: MfaService;
  let mfaSettingsRepository: Repository<MfaSettings>;
  let mfaChallengeRepository: Repository<MfaChallenge>;
  let userRepository: Repository<User>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    mfaEnabled: false,
  };

  const mockMfaSettings = {
    id: 'mfa-123',
    userId: 'user-123',
    method: MfaMethod.TOTP,
    secret: 'encrypted-secret',
    backupCodes: null,
    enabled: false,
    verified: false,
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'MFA_ENCRYPTION_KEY') {
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getRepositoryToken(MfaSettings),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MfaChallenge),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    mfaSettingsRepository = module.get<Repository<MfaSettings>>(getRepositoryToken(MfaSettings));
    mfaChallengeRepository = module.get<Repository<MfaChallenge>>(getRepositoryToken(MfaChallenge));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTotpSecret', () => {
    it('should generate TOTP secret and QR code for user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(mfaSettingsRepository, 'create').mockReturnValue(mockMfaSettings as MfaSettings);
      jest.spyOn(mfaSettingsRepository, 'save').mockResolvedValue(mockMfaSettings as MfaSettings);

      const result = await service.generateTotpSecret('user-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result.secret).toBeTruthy();
      expect(result.qrCodeUrl).toContain('data:image/png;base64');
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.generateTotpSecret('invalid-user')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(mockMfaSettings as MfaSettings);
      jest.spyOn(mfaSettingsRepository, 'save').mockResolvedValue(mockMfaSettings as MfaSettings);

      const backupCodes = await service.generateBackupCodes('user-123');

      expect(backupCodes).toHaveLength(10);
      expect(backupCodes[0]).toHaveLength(8);
      // Check that all codes are unique
      const uniqueCodes = new Set(backupCodes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should store hashed backup codes', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(mockMfaSettings as MfaSettings);
      const saveSpy = jest.spyOn(mfaSettingsRepository, 'save').mockResolvedValue(mockMfaSettings as MfaSettings);

      await service.generateBackupCodes('user-123');

      expect(saveSpy).toHaveBeenCalled();
      const savedSettings = saveSpy.mock.calls[0][0];
      expect(savedSettings.backupCodes).toBeTruthy();

      // Verify codes are hashed
      const hashedCodes = JSON.parse(savedSettings.backupCodes);
      expect(hashedCodes).toHaveLength(10);
      // Bcrypt hashes start with $2b$
      expect(hashedCodes[0]).toMatch(/^\$2[aby]\$/);
    });

    it('should throw error if MFA not set up', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(null);

      await expect(service.generateBackupCodes('user-123')).rejects.toThrow(
        'MFA not set up for this user',
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code and invalidate it', async () => {
      const testCode = 'ABCD1234';
      const hashedCode = await bcrypt.hash(testCode, 12);
      const settingsWithCodes = {
        ...mockMfaSettings,
        backupCodes: JSON.stringify([hashedCode, 'other-hash']),
      };

      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(settingsWithCodes as MfaSettings);
      const saveSpy = jest.spyOn(mfaSettingsRepository, 'save').mockResolvedValue(settingsWithCodes as MfaSettings);

      const result = await service.verifyBackupCode('user-123', testCode);

      expect(result).toBe(true);
      expect(saveSpy).toHaveBeenCalled();

      // Check that used code was removed
      const savedSettings = saveSpy.mock.calls[0][0];
      const remainingCodes = JSON.parse(savedSettings.backupCodes);
      expect(remainingCodes).toHaveLength(1);
      expect(remainingCodes[0]).toBe('other-hash');
    });

    it('should reject invalid backup code', async () => {
      const settingsWithCodes = {
        ...mockMfaSettings,
        backupCodes: JSON.stringify(['hash1', 'hash2']),
      };

      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(settingsWithCodes as MfaSettings);

      const result = await service.verifyBackupCode('user-123', 'INVALID');

      expect(result).toBe(false);
    });
  });

  describe('createChallenge', () => {
    it('should create TOTP challenge', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue({
        ...mockMfaSettings,
        enabled: true,
      } as MfaSettings);

      const mockChallenge = {
        id: 'challenge-123',
        userId: 'user-123',
        challengeType: ChallengeType.TOTP,
        code: '',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        maxAttempts: 5,
        verified: false,
      };

      jest.spyOn(mfaChallengeRepository, 'create').mockReturnValue(mockChallenge as MfaChallenge);
      jest.spyOn(mfaChallengeRepository, 'save').mockResolvedValue(mockChallenge as MfaChallenge);

      const challenge = await service.createChallenge(
        'user-123',
        ChallengeType.TOTP,
        '127.0.0.1',
        'test-agent',
      );

      expect(challenge).toBeDefined();
      expect(challenge.challengeType).toBe(ChallengeType.TOTP);
      expect(challenge.expiresAt).toBeInstanceOf(Date);
    });

    it('should create EMAIL challenge with code', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue({
        ...mockMfaSettings,
        enabled: true,
      } as MfaSettings);

      const mockChallenge = {
        id: 'challenge-123',
        userId: 'user-123',
        challengeType: ChallengeType.EMAIL,
        code: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        maxAttempts: 5,
        verified: false,
      };

      jest.spyOn(mfaChallengeRepository, 'create').mockReturnValue(mockChallenge as MfaChallenge);
      jest.spyOn(mfaChallengeRepository, 'save').mockResolvedValue(mockChallenge as MfaChallenge);

      const challenge = await service.createChallenge(
        'user-123',
        ChallengeType.EMAIL,
        '127.0.0.1',
        'test-agent',
      );

      expect(challenge).toBeDefined();
      expect(challenge.challengeType).toBe(ChallengeType.EMAIL);
      expect(challenge.code).toMatch(/^\d{6}$/);
    });

    it('should throw error if MFA not enabled', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createChallenge('user-123', ChallengeType.TOTP),
      ).rejects.toThrow('MFA not enabled for this user');
    });
  });

  describe('getMfaStatus', () => {
    it('should return MFA status for user with MFA enabled', async () => {
      const settingsWithBackupCodes = {
        ...mockMfaSettings,
        enabled: true,
        verified: true,
        backupCodes: JSON.stringify(['code1', 'code2']),
      };

      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(settingsWithBackupCodes as MfaSettings);

      const status = await service.getMfaStatus('user-123');

      expect(status.enabled).toBe(true);
      expect(status.verified).toBe(true);
      expect(status.method).toBe(MfaMethod.TOTP);
      expect(status.hasBackupCodes).toBe(true);
    });

    it('should return disabled status for user without MFA', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(null);

      const status = await service.getMfaStatus('user-123');

      expect(status.enabled).toBe(false);
      expect(status.verified).toBe(false);
      expect(status.method).toBeNull();
      expect(status.hasBackupCodes).toBe(false);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA for user', async () => {
      jest.spyOn(mfaSettingsRepository, 'findOne').mockResolvedValue(mockMfaSettings as MfaSettings);
      const saveSpy = jest.spyOn(mfaSettingsRepository, 'save').mockResolvedValue(mockMfaSettings as MfaSettings);
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.disableMfa('user-123');

      expect(result).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith('user-123', { mfaEnabled: false });

      const savedSettings = saveSpy.mock.calls[0][0];
      expect(savedSettings.enabled).toBe(false);
      expect(savedSettings.verified).toBe(false);
      expect(savedSettings.secret).toBeNull();
      expect(savedSettings.backupCodes).toBeNull();
    });
  });
});
