import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    signup: jest.fn(),
    signin: jest.fn(),
    verifyEmail: jest.fn(),
    requestMagicLink: jest.fn(),
    verifyMagicLink: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    revokeAllSessions: jest.fn(),
    getActiveSessions: jest.fn(),
  };

  const mockRequest = {
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
    connection: {
      remoteAddress: '192.168.1.1',
    },
    user: {
      sub: 'user-123',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.refreshAccessToken.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(refreshTokenDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
        mockRequest.ip,
        mockRequest.headers['user-agent'],
      );
    });

    it('should pass IP and user agent to service', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshAccessToken.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'token',
      });

      await controller.refresh(refreshTokenDto, mockRequest);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });
  });

  describe('logout', () => {
    it('should logout from current device', async () => {
      const logoutDto: LogoutDto = {
        refreshToken: 'refresh-token',
        allDevices: false,
      };

      const expectedResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      authService.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout(logoutDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.logout).toHaveBeenCalledWith(logoutDto.refreshToken, false);
    });

    it('should logout from all devices', async () => {
      const logoutDto: LogoutDto = {
        refreshToken: 'refresh-token',
        allDevices: true,
      };

      const expectedResponse = {
        success: true,
        message: 'Logged out from 3 device(s)',
      };

      authService.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout(logoutDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.logout).toHaveBeenCalledWith(logoutDto.refreshToken, true);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      const expectedResponse = {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      };

      authService.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto.email);
    });

    it('should not reveal if account exists', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      const expectedResponse = {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      };

      authService.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account exists');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!',
      };

      const expectedResponse = {
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
      };

      authService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewSecurePassword123!',
      };

      const expectedResponse = {
        success: true,
        message: 'Password changed successfully. Other sessions have been logged out.',
      };

      authService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(changePasswordDto, mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockRequest.user.sub,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
    });

    it('should use user ID from JWT token', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewSecurePassword123!',
      };

      authService.changePassword.mockResolvedValue({
        success: true,
        message: 'Password changed',
      });

      await controller.changePassword(changePasswordDto, mockRequest);

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for user', async () => {
      const expectedResponse = {
        success: true,
        count: 3,
      };

      authService.revokeAllSessions.mockResolvedValue(expectedResponse);

      const result = await controller.revokeAllSessions(mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(authService.revokeAllSessions).toHaveBeenCalledWith(mockRequest.user.sub);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions', async () => {
      const expectedSessions = [
        {
          id: 'session-1',
          deviceName: 'iPhone',
          ipAddress: '192.168.1.1',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'session-2',
          deviceName: 'Mac',
          ipAddress: '192.168.1.2',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      authService.getActiveSessions.mockResolvedValue(expectedSessions);

      const result = await controller.getActiveSessions(mockRequest);

      expect(result).toEqual(expectedSessions);
      expect(authService.getActiveSessions).toHaveBeenCalledWith(mockRequest.user.sub);
    });

    it('should return empty array if no sessions', async () => {
      authService.getActiveSessions.mockResolvedValue([]);

      const result = await controller.getActiveSessions(mockRequest);

      expect(result).toEqual([]);
    });
  });
});
