import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { MfaService } from '../../mfa/services/mfa.service';
import { TrustedDeviceService } from '../../mfa/services/trusted-device.service';
import { EmailMfaService } from '../../mfa/services/email-mfa.service';
import { MfaRateLimitGuard } from '../../mfa/guards/mfa-rate-limit.guard';
import { VerifyMfaDto, VerifyMfaResponseDto } from '../../mfa/dto';
import { ChallengeType } from '../../mfa/entities/mfa-challenge.entity';
import { UseBackupCodeDto } from '../../mfa/dto/backup-code.dto';

@Controller('api/v1/auth/mfa')
export class MfaAuthController {
  private readonly logger = new Logger(MfaAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly trustedDeviceService: TrustedDeviceService,
    private readonly emailMfaService: EmailMfaService,
  ) {}

  /**
   * POST /api/v1/auth/mfa/verify
   * Verify MFA code and issue JWT tokens
   */
  @Post('verify')
  @UseGuards(MfaRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Request() req,
    @Body() verifyDto: VerifyMfaDto,
  ): Promise<VerifyMfaResponseDto> {
    const { challengeId, code, trustDevice, deviceName } = verifyDto;

    this.logger.log(`Verifying MFA for challenge ${challengeId}`);

    // Verify the MFA code
    const verified = await this.mfaService.verifyChallenge(challengeId, code);

    if (!verified) {
      throw new UnauthorizedException('Invalid or expired MFA code');
    }

    // Get challenge to extract user ID
    const challenge = await this.mfaService['mfaChallengeRepository'].findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new UnauthorizedException('Challenge not found');
    }

    // Issue JWT tokens
    const tokens = await this.authService.verifyMfaAndIssueToken(
      challenge.userId,
      challengeId,
      verified,
    );

    // Handle device trust if requested
    let deviceTrusted = false;
    if (trustDevice) {
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const finalDeviceName =
        deviceName || this.trustedDeviceService.extractDeviceName(userAgent);

      await this.trustedDeviceService.trustDevice(
        challenge.userId,
        userAgent,
        ipAddress,
        finalDeviceName,
      );

      deviceTrusted = true;
      this.logger.log(`Device trusted for user ${challenge.userId}`);
    }

    return {
      verified: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceTrusted,
    };
  }

  /**
   * POST /api/v1/auth/mfa/backup-code
   * Verify backup code and issue JWT tokens
   */
  @Post('backup-code')
  @UseGuards(MfaRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async verifyBackupCode(
    @Request() req,
    @Body() backupCodeDto: UseBackupCodeDto,
  ): Promise<VerifyMfaResponseDto> {
    // Extract user ID from request (should be in session/temp storage)
    const userId = req.body.userId; // This should be passed from the frontend after initial login

    if (!userId) {
      throw new UnauthorizedException('User ID required for backup code verification');
    }

    this.logger.log(`Verifying backup code for user ${userId}`);

    const verified = await this.mfaService.verifyBackupCode(userId, backupCodeDto.code);

    if (!verified) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Issue JWT tokens
    const tokens = await this.authService.verifyMfaAndIssueToken(userId, 'backup-code', verified);

    return {
      verified: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * POST /api/v1/auth/mfa/challenge
   * Create MFA challenge (for SMS/Email methods)
   */
  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  async createChallenge(@Request() req, @Body() body: { userId: string; type: ChallengeType }) {
    const { userId, type } = body;

    this.logger.log(`Creating MFA challenge for user ${userId}, type: ${type}`);

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check if device is trusted
    if (type === ChallengeType.TOTP) {
      const trustedDevice = await this.trustedDeviceService.isTrustedDevice(
        userId,
        userAgent,
        ipAddress,
      );

      if (trustedDevice) {
        // Device is trusted, skip MFA
        const tokens = await this.authService.verifyMfaAndIssueToken(userId, 'trusted-device', true);
        return {
          trusted: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
    }

    const challenge = await this.mfaService.createChallenge(userId, type, ipAddress, userAgent);

    // For SMS/Email, send the code
    if (type === ChallengeType.EMAIL && challenge.code) {
      const user = await this.mfaService['userRepository'].findOne({ where: { id: userId } });
      if (user) {
        await this.emailMfaService.sendMfaCode(user.email, challenge.code);
      }
    }

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,
      method: type,
      message: type === ChallengeType.TOTP
        ? 'Enter code from your authenticator app'
        : `Verification code sent via ${type}`,
    };
  }
}
