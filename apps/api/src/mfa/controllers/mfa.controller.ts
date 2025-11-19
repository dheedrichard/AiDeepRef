import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MfaService } from '../services/mfa.service';
import { TrustedDeviceService } from '../services/trusted-device.service';
import { EmailMfaService } from '../services/email-mfa.service';
import { MfaRateLimitGuard } from '../guards/mfa-rate-limit.guard';
import {
  SetupTotpDto,
  SetupTotpResponseDto,
  VerifyTotpDto,
  VerifyTotpResponseDto,
  DisableMfaDto,
  DisableMfaResponseDto,
  GenerateBackupCodesResponseDto,
  MfaStatusResponseDto,
  TrustedDeviceResponseDto,
  TrustDeviceDto,
} from '../dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Controller('api/v1/mfa')
export class MfaController {
  private readonly logger = new Logger(MfaController.name);

  constructor(
    private readonly mfaService: MfaService,
    private readonly trustedDeviceService: TrustedDeviceService,
    private readonly emailMfaService: EmailMfaService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * POST /api/v1/mfa/setup/totp
   * Initialize TOTP setup - generates secret and QR code
   */
  @Post('setup/totp')
  @UseGuards(JwtAuthGuard)
  async setupTotp(
    @Request() req,
    @Body() _setupDto: SetupTotpDto,
  ): Promise<SetupTotpResponseDto> {
    const userId = req.user.sub;

    this.logger.log(`Setting up TOTP for user ${userId}`);

    const { secret, qrCodeUrl } = await this.mfaService.generateTotpSecret(userId);

    return {
      secret,
      qrCodeUrl,
    };
  }

  /**
   * POST /api/v1/mfa/verify/totp
   * Verify TOTP code and enable MFA
   */
  @Post('verify/totp')
  @UseGuards(JwtAuthGuard, MfaRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async verifyTotp(
    @Request() req,
    @Body() verifyDto: VerifyTotpDto,
  ): Promise<VerifyTotpResponseDto> {
    const userId = req.user.sub;

    this.logger.log(`Verifying TOTP for user ${userId}`);

    const verified = await this.mfaService.verifyTotp(userId, verifyDto.code);

    if (!verified) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = await this.mfaService.generateBackupCodes(userId);

    this.logger.log(`TOTP enabled successfully for user ${userId}`);

    return {
      verified: true,
      backupCodes,
    };
  }

  /**
   * GET /api/v1/mfa/status
   * Get MFA status for current user
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getMfaStatus(@Request() req): Promise<MfaStatusResponseDto> {
    const userId = req.user.sub;

    const status = await this.mfaService.getMfaStatus(userId);
    const trustedDevicesCount = await this.trustedDeviceService.getTrustedDeviceCount(userId);

    return {
      ...status,
      trustedDevicesCount,
    };
  }

  /**
   * POST /api/v1/mfa/backup-codes/regenerate
   * Generate new backup codes (invalidates old ones)
   */
  @Post('backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateBackupCodes(@Request() req): Promise<GenerateBackupCodesResponseDto> {
    const userId = req.user.sub;

    this.logger.log(`Regenerating backup codes for user ${userId}`);

    const backupCodes = await this.mfaService.generateBackupCodes(userId);

    return {
      backupCodes,
      message: 'New backup codes generated successfully. Store them securely.',
    };
  }

  /**
   * DELETE /api/v1/mfa/disable
   * Disable MFA (requires password confirmation)
   */
  @Delete('disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disableMfa(
    @Request() req,
    @Body() disableDto: DisableMfaDto,
  ): Promise<DisableMfaResponseDto> {
    const userId = req.user.sub;

    // Verify password
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(disableDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    this.logger.log(`Disabling MFA for user ${userId}`);

    await this.mfaService.disableMfa(userId);
    await this.trustedDeviceService.revokeAllTrustedDevices(userId);

    return {
      disabled: true,
      message: 'Two-factor authentication has been disabled',
    };
  }

  /**
   * GET /api/v1/mfa/devices
   * Get list of trusted devices
   */
  @Get('devices')
  @UseGuards(JwtAuthGuard)
  async getTrustedDevices(@Request() req): Promise<TrustedDeviceResponseDto[]> {
    const userId = req.user.sub;

    const devices = await this.trustedDeviceService.getTrustedDevices(userId);

    return devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
      trustedAt: device.trustedAt,
      expiresAt: device.expiresAt,
      lastUsedAt: device.lastUsedAt,
    }));
  }

  /**
   * POST /api/v1/mfa/devices/trust
   * Trust current device (called after successful MFA verification)
   */
  @Post('devices/trust')
  @UseGuards(JwtAuthGuard)
  async trustDevice(
    @Request() req,
    @Body() trustDto: TrustDeviceDto,
  ): Promise<TrustedDeviceResponseDto> {
    const userId = req.user.sub;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const deviceName =
      trustDto.deviceName || this.trustedDeviceService.extractDeviceName(userAgent);

    this.logger.log(`Trusting device for user ${userId}: ${deviceName}`);

    const device = await this.trustedDeviceService.trustDevice(
      userId,
      userAgent,
      ipAddress,
      deviceName,
    );

    // Send notification email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.emailMfaService.sendTrustedDeviceNotification(
        user.email,
        deviceName,
        ipAddress,
      );
    }

    return {
      id: device.id,
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
      trustedAt: device.trustedAt,
      expiresAt: device.expiresAt,
      lastUsedAt: device.lastUsedAt,
    };
  }

  /**
   * DELETE /api/v1/mfa/devices/:deviceId
   * Revoke a trusted device
   */
  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeTrustedDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user.sub;

    this.logger.log(`Revoking device ${deviceId} for user ${userId}`);

    const revoked = await this.trustedDeviceService.revokeTrustedDevice(userId, deviceId);

    if (!revoked) {
      throw new UnauthorizedException('Device not found or already revoked');
    }

    return {
      revoked: true,
      message: 'Device has been revoked',
    };
  }

  /**
   * DELETE /api/v1/mfa/devices
   * Revoke all trusted devices
   */
  @Delete('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeAllTrustedDevices(@Request() req) {
    const userId = req.user.sub;

    this.logger.log(`Revoking all devices for user ${userId}`);

    const count = await this.trustedDeviceService.revokeAllTrustedDevices(userId);

    return {
      revoked: true,
      count,
      message: `${count} device(s) have been revoked`,
    };
  }
}
