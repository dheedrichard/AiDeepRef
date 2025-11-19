import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MfaSettings, MfaMethod } from '../entities/mfa-settings.entity';
import { MfaChallenge, ChallengeType } from '../entities/mfa-challenge.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(MfaSettings)
    private mfaSettingsRepository: Repository<MfaSettings>,
    @InjectRepository(MfaChallenge)
    private mfaChallengeRepository: Repository<MfaChallenge>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    const key = this.configService.get<string>('MFA_ENCRYPTION_KEY');
    if (!key || key.length !== 64) {
      throw new Error('MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * Generate TOTP secret for user
   */
  async generateTotpSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DeepRef (${user.email})`,
      issuer: 'DeepRef',
      length: 32,
    });

    // Check if user already has MFA settings
    let mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      mfaSettings = this.mfaSettingsRepository.create({
        userId,
        method: MfaMethod.TOTP,
        enabled: false,
        verified: false,
      });
    }

    // Encrypt and store the secret
    mfaSettings.secret = this.encrypt(secret.base32);
    await this.mfaSettingsRepository.save(mfaSettings);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    this.logger.log(`TOTP secret generated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyTotp(userId: string, code: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.secret) {
      throw new BadRequestException('MFA not set up for this user');
    }

    const secret = this.decrypt(mfaSettings.secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before and after (±60 seconds)
    });

    if (verified) {
      mfaSettings.verified = true;
      mfaSettings.enabled = true;
      await this.mfaSettingsRepository.save(mfaSettings);

      // Update user entity
      await this.userRepository.update(userId, { mfaEnabled: true });

      this.logger.log(`TOTP verified and enabled for user ${userId}`);
    }

    return verified;
  }

  /**
   * Generate backup codes for recovery
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      throw new BadRequestException('MFA not set up for this user');
    }

    // Generate 10 backup codes (8 characters each)
    const backupCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      const hashedCode = await bcrypt.hash(code, 12);
      hashedCodes.push(hashedCode);
    }

    // Store hashed codes
    mfaSettings.backupCodes = JSON.stringify(hashedCodes);
    await this.mfaSettingsRepository.save(mfaSettings);

    this.logger.log(`Backup codes generated for user ${userId}`);

    return backupCodes;
  }

  /**
   * Verify backup code and invalidate it
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings || !mfaSettings.backupCodes) {
      throw new BadRequestException('No backup codes available');
    }

    const hashedCodes: string[] = JSON.parse(mfaSettings.backupCodes);

    // Check each hashed code
    for (let i = 0; i < hashedCodes.length; i++) {
      const isMatch = await bcrypt.compare(code, hashedCodes[i]);
      if (isMatch) {
        // Remove the used code
        hashedCodes.splice(i, 1);
        mfaSettings.backupCodes = JSON.stringify(hashedCodes);
        await this.mfaSettingsRepository.save(mfaSettings);

        this.logger.log(`Backup code used for user ${userId}. Remaining: ${hashedCodes.length}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Create an MFA challenge for login
   */
  async createChallenge(
    userId: string,
    type: ChallengeType,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MfaChallenge> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({
      where: { userId, enabled: true }
    });

    if (!mfaSettings) {
      throw new BadRequestException('MFA not enabled for this user');
    }

    // For TOTP, we don't generate a code (user provides it from their app)
    // For SMS/Email, we generate a 6-digit code
    let code: string | null = null;
    if (type === ChallengeType.SMS || type === ChallengeType.EMAIL) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Create challenge
    const challenge = this.mfaChallengeRepository.create({
      userId,
      challengeType: type,
      code: code ? await bcrypt.hash(code, 12) : '',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      maxAttempts: 5,
      verified: false,
      ipAddress,
      userAgent,
    });

    const savedChallenge = await this.mfaChallengeRepository.save(challenge);

    this.logger.log(`MFA challenge created for user ${userId}, type: ${type}`);

    // Return the plain code for SMS/Email services to send
    return { ...savedChallenge, code: code || '' };
  }

  /**
   * Verify MFA challenge
   */
  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    const challenge = await this.mfaChallengeRepository.findOne({
      where: { id: challengeId },
      relations: ['user'],
    });

    if (!challenge) {
      throw new UnauthorizedException('Invalid challenge');
    }

    // Check if challenge expired
    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('Challenge expired');
    }

    // Check if already verified
    if (challenge.verified) {
      throw new UnauthorizedException('Challenge already used');
    }

    // Check max attempts
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('Maximum verification attempts exceeded');
    }

    // Increment attempts
    challenge.attempts += 1;
    await this.mfaChallengeRepository.save(challenge);

    let verified = false;

    if (challenge.challengeType === ChallengeType.TOTP) {
      // Verify TOTP code
      const mfaSettings = await this.mfaSettingsRepository.findOne({
        where: { userId: challenge.userId },
      });

      if (!mfaSettings || !mfaSettings.secret) {
        throw new BadRequestException('TOTP not configured');
      }

      const secret = this.decrypt(mfaSettings.secret);
      verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
    } else {
      // Verify SMS/Email code
      verified = await bcrypt.compare(code, challenge.code);
    }

    if (verified) {
      challenge.verified = true;
      challenge.verifiedAt = new Date();
      await this.mfaChallengeRepository.save(challenge);

      this.logger.log(`MFA challenge verified for user ${challenge.userId}`);
    }

    return verified;
  }

  /**
   * Get MFA status for user
   */
  async getMfaStatus(userId: string) {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      return {
        enabled: false,
        verified: false,
        method: null,
        hasBackupCodes: false,
      };
    }

    const backupCodes = mfaSettings.backupCodes ? JSON.parse(mfaSettings.backupCodes) : [];

    return {
      enabled: mfaSettings.enabled,
      verified: mfaSettings.verified,
      method: mfaSettings.method,
      hasBackupCodes: backupCodes.length > 0,
      phoneNumber: mfaSettings.phoneNumber,
    };
  }

  /**
   * Disable MFA for user
   */
  async disableMfa(userId: string): Promise<boolean> {
    const mfaSettings = await this.mfaSettingsRepository.findOne({ where: { userId } });

    if (!mfaSettings) {
      return true; // Already disabled
    }

    mfaSettings.enabled = false;
    mfaSettings.verified = false;
    mfaSettings.secret = null;
    mfaSettings.backupCodes = null;
    await this.mfaSettingsRepository.save(mfaSettings);

    // Update user entity
    await this.userRepository.update(userId, { mfaEnabled: false });

    this.logger.log(`MFA disabled for user ${userId}`);

    return true;
  }

  /**
   * Clean up expired challenges (should be run periodically)
   */
  async cleanupExpiredChallenges(): Promise<number> {
    const result = await this.mfaChallengeRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    const count = result.affected || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired MFA challenges`);
    }

    return count;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
