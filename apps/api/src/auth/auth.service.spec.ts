import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { EmailService } from '../common/services/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendMagicLinkEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendKycStatusEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.SEEKER,
    };

    it('should successfully create a new user', async () => {
      const hashedPassword = 'hashedPassword123';
      const savedUser = {
        id: 'user-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        password: hashedPassword,
        role: signupDto.role,
        emailVerificationCode: '123456',
        emailVerificationExpiry: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword as never));
      userRepository.create.mockReturnValue(savedUser as any);
      userRepository.save.mockResolvedValue(savedUser as any);
      jwtService.sign.mockReturnValue('jwt-token');
      emailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.signup(signupDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: signupDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          email: signupDto.email,
          password: hashedPassword,
          role: signupDto.role,
        })
      );
      expect(userRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
      });
      expect(result).toEqual({
        userId: savedUser.id,
        email: savedUser.email,
        token: 'jwt-token',
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        savedUser.email,
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = { id: 'existing-user', email: signupDto.email };
      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: signupDto.email } });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should generate verification code and expiry', async () => {
      const hashedPassword = 'hashedPassword123';
      const mockDate = new Date('2024-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      userRepository.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword as never));

      const createSpy = jest.fn().mockReturnValue({
        id: 'user-123',
        email: signupDto.email,
      });
      userRepository.create = createSpy;
      userRepository.save.mockResolvedValue({ id: 'user-123', email: signupDto.email } as any);
      jwtService.sign.mockReturnValue('jwt-token');

      await service.signup(signupDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerificationCode: expect.stringMatching(/^\d{6}$/),
          emailVerificationExpiry: expect.any(Date),
        })
      );

      jest.restoreAllMocks();
    });
  });

  describe('signin', () => {
    const signinDto: SigninDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const existingUser = {
      id: 'user-123',
      email: signinDto.email,
      password: 'hashedPassword',
      role: UserRole.SEEKER,
      lastLoginAt: null,
    };

    it('should successfully sign in a user with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true as never));
      userRepository.save.mockResolvedValue(existingUser as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.signin(signinDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: signinDto.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(signinDto.password, existingUser.password);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        })
      );
      expect(result).toEqual({
        userId: existingUser.id,
        token: 'jwt-token',
        role: existingUser.role,
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.signin(signinDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: signinDto.email } });
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false as never));

      await expect(service.signin(signinDto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith(signinDto.password, existingUser.password);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is not provided (magic link)', async () => {
      const signinDtoNoPassword = { email: signinDto.email };
      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.signin(signinDtoNoPassword as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should update lastLoginAt on successful signin', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      userRepository.findOne.mockResolvedValue(existingUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true as never));

      const saveSpy = jest.fn().mockResolvedValue(existingUser);
      userRepository.save = saveSpy;
      jwtService.sign.mockReturnValue('jwt-token');

      await service.signin(signinDto);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: mockDate,
        })
      );

      jest.restoreAllMocks();
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      email: 'test@example.com',
      code: '123456',
    };

    const existingUser = {
      id: 'user-123',
      email: verifyEmailDto.email,
      emailVerified: false,
      emailVerificationCode: '123456',
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    };

    it('should successfully verify email with valid code', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue({
        ...existingUser,
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      } as any);

      const result = await service.verifyEmail(verifyEmailDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: verifyEmailDto.email } });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      });
      expect(result).toEqual({ verified: true });
    });

    it('should return verified true if email already verified', async () => {
      const verifiedUser = { ...existingUser, emailVerified: true };
      userRepository.findOne.mockResolvedValue(verifiedUser as any);

      const result = await service.verifyEmail(verifyEmailDto);

      expect(result).toEqual({ verified: true });
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if code is invalid', async () => {
      const userWithWrongCode = { ...existingUser, emailVerificationCode: '654321' };
      userRepository.findOne.mockResolvedValue(userWithWrongCode as any);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if code is expired', async () => {
      const userWithExpiredCode = {
        ...existingUser,
        emailVerificationExpiry: new Date(Date.now() - 1000), // 1 second ago
      };
      userRepository.findOne.mockResolvedValue(userWithExpiredCode as any);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if verification expiry is null', async () => {
      const userWithNullExpiry = {
        ...existingUser,
        emailVerificationExpiry: null,
      };
      userRepository.findOne.mockResolvedValue(userWithNullExpiry as any);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestMagicLink', () => {
    const magicLinkDto: MagicLinkDto = {
      email: 'test@example.com',
    };

    const existingUser = {
      id: 'user-123',
      email: magicLinkDto.email,
      magicLinkToken: null,
      magicLinkExpiry: null,
    };

    it('should generate and send magic link for existing user', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue(existingUser as any);
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMagicLinkEmail.mockResolvedValue(true);

      const result = await service.requestMagicLink(magicLinkDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: magicLinkDto.email },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          magicLinkToken: expect.any(String),
          magicLinkExpiry: expect.any(Date),
        })
      );
      expect(emailService.sendMagicLinkEmail).toHaveBeenCalledWith(
        magicLinkDto.email,
        expect.stringContaining('http://localhost:3000/api/v1/auth/magic-link/verify/')
      );
      expect(result).toEqual({
        success: true,
        message: 'If an account exists, a magic link has been sent.',
      });
    });

    it('should not reveal if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.requestMagicLink(magicLinkDto);

      expect(result).toEqual({
        success: true,
        message: 'If an account exists, a magic link has been sent.',
      });
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendMagicLinkEmail).not.toHaveBeenCalled();
    });

    it('should set magic link expiry to 15 minutes', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) return mockDate as any;
        return new (Date as any)(...args);
      });

      userRepository.findOne.mockResolvedValue(existingUser as any);
      const saveSpy = jest.fn().mockResolvedValue(existingUser);
      userRepository.save = saveSpy;
      configService.get.mockReturnValue('http://localhost:3000');
      emailService.sendMagicLinkEmail.mockResolvedValue(true);

      await service.requestMagicLink(magicLinkDto);

      const savedUser = saveSpy.mock.calls[0][0];
      const expiryTime = savedUser.magicLinkExpiry.getTime();
      const expectedExpiry = new Date(mockDate.getTime() + 15 * 60 * 1000).getTime();

      expect(expiryTime).toBe(expectedExpiry);

      jest.restoreAllMocks();
    });
  });

  describe('verifyMagicLink', () => {
    const token = 'valid-magic-link-token';

    const existingUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: UserRole.SEEKER,
      magicLinkToken: token,
      magicLinkExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      emailVerified: false,
      lastLoginAt: null,
    };

    it('should successfully verify magic link and return JWT', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      userRepository.save.mockResolvedValue({
        ...existingUser,
        magicLinkToken: null,
        magicLinkExpiry: null,
        emailVerified: true,
      } as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.verifyMagicLink(token);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { magicLinkToken: token },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          magicLinkToken: null,
          magicLinkExpiry: null,
          emailVerified: true,
          lastLoginAt: expect.any(Date),
        })
      );
      expect(result).toEqual({
        userId: existingUser.id,
        token: 'jwt-token',
        role: existingUser.role,
        email: existingUser.email,
      });
    });

    it('should throw UnauthorizedException if token not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyMagicLink(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      const expiredUser = {
        ...existingUser,
        magicLinkExpiry: new Date(Date.now() - 1000), // 1 second ago
      };
      userRepository.findOne.mockResolvedValue(expiredUser as any);

      await expect(service.verifyMagicLink(token)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if expiry is null', async () => {
      const userWithNullExpiry = {
        ...existingUser,
        magicLinkExpiry: null,
      };
      userRepository.findOne.mockResolvedValue(userWithNullExpiry as any);

      await expect(service.verifyMagicLink(token)).rejects.toThrow(UnauthorizedException);
    });

    it('should auto-verify email when using magic link', async () => {
      userRepository.findOne.mockResolvedValue(existingUser as any);
      const saveSpy = jest.fn().mockResolvedValue(existingUser);
      userRepository.save = saveSpy;
      jwtService.sign.mockReturnValue('jwt-token');

      await service.verifyMagicLink(token);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
        })
      );
    });
  });
});
