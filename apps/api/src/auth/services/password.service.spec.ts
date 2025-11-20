import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './password.service';
import { User, UserRole } from '../../database/entities';

describe('PasswordService', () => {
  let service: PasswordService;
  let userRepository: jest.Mocked<Repository<User>>;

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
    passwordResetToken: null,
    passwordResetExpiry: null,
    passwordChangedAt: null,
    profilePictureUrl: null,
    phoneNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    lastFailedLoginAt: null,
    lockedUntil: null,
  } as any;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should validate a strong password', async () => {
      await expect(service.validatePassword('StrongPass123!')).resolves.not.toThrow();
    });

    it('should reject password shorter than 8 characters', async () => {
      await expect(service.validatePassword('Pass1!')).rejects.toThrow(BadRequestException);
    });

    it('should reject password without uppercase letters', async () => {
      await expect(service.validatePassword('password123!')).rejects.toThrow(BadRequestException);
    });

    it('should reject password without lowercase letters', async () => {
      await expect(service.validatePassword('PASSWORD123!')).rejects.toThrow(BadRequestException);
    });

    it('should reject password without numbers', async () => {
      await expect(service.validatePassword('Password!')).rejects.toThrow(BadRequestException);
    });

    it('should reject password without special characters', async () => {
      await expect(service.validatePassword('Password123')).rejects.toThrow(BadRequestException);
    });

    it('should reject common passwords', async () => {
      await expect(service.validatePassword('Password123')).rejects.toThrow(BadRequestException);
    });

    it('should reject passwords with sequential characters', async () => {
      await expect(service.validatePassword('Abc12345!')).rejects.toThrow(BadRequestException);
    });

    it('should reject passwords with repeated characters', async () => {
      await expect(service.validatePassword('Passsss123!')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateResetToken', () => {
    it('should generate reset token for existing user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.generateResetToken('test@example.com');

      expect(result).toBeDefined();
      expect(result?.token).toBeDefined();
      expect(result?.user).toEqual(mockUser);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpiry: expect.any(Date),
        }),
      );
    });

    it('should return null for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.generateResetToken('nonexistent@example.com');

      expect(result).toBeNull();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should set token expiry to 1 hour', async () => {
      const now = new Date();
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user: any) => {
        const expiryTime = user.passwordResetExpiry.getTime();
        const expectedExpiry = now.getTime() + 3600000; // 1 hour
        expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(expiryTime).toBeLessThanOrEqual(expectedExpiry + 1000);
        return Promise.resolve(user);
      });

      await service.generateResetToken('test@example.com');

      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('validateResetToken', () => {
    it('should validate a valid reset token', async () => {
      const validUser = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpiry: new Date(Date.now() + 3600000),
      };

      userRepository.findOne.mockResolvedValue(validUser as any);

      const result = await service.validateResetToken('valid-token');

      expect(result).toEqual(validUser);
    });

    it('should throw error for invalid token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateResetToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error for expired token', async () => {
      const expiredUser = {
        ...mockUser,
        passwordResetToken: 'expired-token',
        passwordResetExpiry: new Date(Date.now() - 1000),
      };

      userRepository.findOne.mockResolvedValue(expiredUser as any);

      await expect(service.validateResetToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const validUser = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpiry: new Date(Date.now() + 3600000),
      };

      userRepository.findOne.mockResolvedValue(validUser as any);
      userRepository.save.mockResolvedValue({} as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false as never));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('newHashedPassword' as never));

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newHashedPassword',
          passwordResetToken: null,
          passwordResetExpiry: null,
          passwordChangedAt: expect.any(Date),
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        }),
      );
    });

    it('should throw error if new password is same as old', async () => {
      const validUser = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpiry: new Date(Date.now() + 3600000),
        password: 'hashedPassword',
      };

      userRepository.findOne.mockResolvedValue(validUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true as never));

      await expect(service.resetPassword('valid-token', 'SamePassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for weak password', async () => {
      const validUser = {
        ...mockUser,
        passwordResetToken: 'valid-token',
        passwordResetExpiry: new Date(Date.now() + 3600000),
      };

      userRepository.findOne.mockResolvedValue(validUser as any);

      await expect(service.resetPassword('valid-token', 'weak')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({} as any);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementationOnce(() => Promise.resolve(true as never)) // Current password correct
        .mockImplementationOnce(() => Promise.resolve(false as never)); // New password different
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('newHashedPassword' as never));

      await service.changePassword('user-123', 'CurrentPassword123!', 'NewPassword123!');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newHashedPassword',
          passwordChangedAt: expect.any(Date),
        }),
      );
    });

    it('should throw error if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('user-123', 'CurrentPassword123!', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error if current password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false as never));

      await expect(
        service.changePassword('user-123', 'WrongPassword123!', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error if new password is same as current', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementationOnce(() => Promise.resolve(true as never)) // Current password correct
        .mockImplementationOnce(() => Promise.resolve(true as never)); // New password same

      await expect(
        service.changePassword('user-123', 'CurrentPassword123!', 'CurrentPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user has no password set', async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      userRepository.findOne.mockResolvedValue(userWithoutPassword as any);

      await expect(
        service.changePassword('user-123', 'CurrentPassword123!', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('wasPasswordRecentlyChanged', () => {
    it('should return true if password was changed recently', async () => {
      const recentlyChangedUser = {
        ...mockUser,
        passwordChangedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      };

      userRepository.findOne.mockResolvedValue(recentlyChangedUser as any);

      const result = await service.wasPasswordRecentlyChanged('user-123', 5);

      expect(result).toBe(true);
    });

    it('should return false if password was not changed recently', async () => {
      const oldChangeUser = {
        ...mockUser,
        passwordChangedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };

      userRepository.findOne.mockResolvedValue(oldChangeUser as any);

      const result = await service.wasPasswordRecentlyChanged('user-123', 5);

      expect(result).toBe(false);
    });

    it('should return false if password was never changed', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.wasPasswordRecentlyChanged('user-123', 5);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.wasPasswordRecentlyChanged('user-123', 5);

      expect(result).toBe(false);
    });
  });
});
