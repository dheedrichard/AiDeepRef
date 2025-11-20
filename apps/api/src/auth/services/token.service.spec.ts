import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User, UserRole } from '../../database/entities';

describe('TokenService', () => {
  let service: TokenService;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.SEEKER,
    password: 'hashedPassword',
    kycStatus: 'pending' as any,
    emailVerified: true,
    isActive: true,
    kycCompleted: false,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    emailVerificationCode: null,
    emailVerificationExpiry: null,
    magicLinkToken: null,
    magicLinkExpiry: null,
    profilePictureUrl: null,
    phoneNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    lastFailedLoginAt: null,
    lockedUntil: null,
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('should create and store a refresh token', async () => {
      const token = 'jwt-refresh-token';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockJwtService.sign.mockReturnValue(token);
      mockRefreshTokenRepository.create.mockReturnValue({
        id: 'token-123',
        token,
        userId: mockUser.id,
      } as any);
      mockRefreshTokenRepository.save.mockResolvedValue({} as any);

      const result = await service.createRefreshToken(mockUser, ipAddress, userAgent);

      expect(result).toBe(token);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          type: 'refresh',
          sessionId: expect.any(String),
        }),
        { expiresIn: '7d' },
      );
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should extract device name from user agent', async () => {
      const token = 'jwt-refresh-token';
      mockJwtService.sign.mockReturnValue(token);
      mockRefreshTokenRepository.create.mockReturnValue({} as any);
      mockRefreshTokenRepository.save.mockResolvedValue({} as any);

      await service.createRefreshToken(mockUser, '192.168.1.1', 'iPhone');

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceName: 'iPhone',
        }),
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate a valid refresh token', async () => {
      const token = 'valid-token';
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh' as const,
        sessionId: 'session-123',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-123',
        token,
        userId: payload.sub,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      } as any);
      mockRefreshTokenRepository.save.mockResolvedValue({} as any);

      const result = await service.validateRefreshToken(token);

      expect(result.userId).toBe(payload.sub);
      expect(result.payload).toEqual(payload);
      expect(refreshTokenRepository.save).toHaveBeenCalled(); // lastUsedAt updated
    });

    it('should throw error if token type is not refresh', async () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
      };

      mockJwtService.verify.mockReturnValue(payload);

      await expect(service.validateRefreshToken('invalid-type-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if token not found in database', async () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        sessionId: 'session-123',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.validateRefreshToken('non-existent-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if token is revoked', async () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        sessionId: 'session-123',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        isRevoked: true,
      } as any);

      await expect(service.validateRefreshToken('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if token is expired', async () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        sessionId: 'session-123',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      } as any);

      await expect(service.validateRefreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token', async () => {
      const token = 'token-to-revoke';
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'token-123',
        token,
        userId: 'user-123',
      } as any);
      mockRefreshTokenRepository.save.mockResolvedValue({} as any);

      const result = await service.revokeToken(token);

      expect(result).toBe(true);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isRevoked: true,
          revokedAt: expect.any(Date),
        }),
      );
    });

    it('should return false if token not found', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.revokeToken('non-existent-token');

      expect(result).toBe(false);
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 3 } as any);

      const result = await service.revokeAllUserTokens('user-123');

      expect(result).toBe(3);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'user-123', isRevoked: false },
        { isRevoked: true, revokedAt: expect.any(Date) },
      );
    });

    it('should return 0 if no tokens to revoke', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 0 } as any);

      const result = await service.revokeAllUserTokens('user-123');

      expect(result).toBe(0);
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceName: 'iPhone',
          lastUsedAt: new Date(),
        },
        {
          id: 'session-2',
          deviceName: 'Mac',
          lastUsedAt: new Date(),
        },
      ];

      mockRefreshTokenRepository.find.mockResolvedValue(sessions as any);

      const result = await service.getUserSessions('user-123');

      expect(result).toEqual(sessions);
      expect(refreshTokenRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        order: { lastUsedAt: 'DESC' },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      mockRefreshTokenRepository.delete.mockResolvedValue({ affected: 5 } as any);

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object), // LessThan matcher
      });
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics', async () => {
      mockRefreshTokenRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(3); // revoked

      const result = await service.getTokenStats('user-123');

      expect(result).toEqual({
        total: 10,
        active: 7,
        revoked: 3,
      });
    });
  });
});
