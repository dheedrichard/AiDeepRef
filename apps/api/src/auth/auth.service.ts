import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../database/entities';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MagicLinkDto } from './dto/magic-link.dto';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, role } = signupDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password complexity
    await this.validatePassword(password);

    // Hash password with stronger salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    // Create user
    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT tokens
    const accessToken = this.generateToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser);

    // Send verification email with code
    await this.emailService.sendVerificationEmail(savedUser.email, verificationCode);

    return {
      userId: savedUser.id,
      email: savedUser.email,
      accessToken,
      refreshToken,
      emailVerified: savedUser.emailVerified,
      role: savedUser.role,
    };
  }

  async signin(signinDto: SigninDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = signinDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is locked. Try again in ${remainingTime} minutes`);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive. Please contact support');
    }

    // If password provided, validate it
    if (password) {
      const isPasswordValid = await bcrypt.compare(password, user.password || '');
      if (!isPasswordValid) {
        await this.handleFailedLogin(user);
        throw new UnauthorizedException('Invalid credentials');
      }
    } else {
      // TODO: Implement magic link authentication
      throw new UnauthorizedException('Magic link authentication not yet implemented');
    }

    // Reset failed login attempts on successful password verification
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockedUntil = null;

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Don't issue full JWT yet - return MFA challenge info
      return {
        mfaRequired: true,
        userId: user.id,
        email: user.email,
        message: 'MFA verification required',
      };
    }

    // Handle successful login (no MFA)
    await this.handleSuccessfulLogin(user);

    const accessToken = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      mfaRequired: false,
      userId: user.id,
      accessToken,
      refreshToken,
      role: user.role,
      emailVerified: user.emailVerified,
      kycCompleted: user.kycCompleted,
    };
  }

  async verifyMfaAndIssueToken(
    userId: string,
    challengeId: string,
    verified: boolean,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!verified) {
      throw new UnauthorizedException('MFA verification failed');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens with MFA verified flag
    const accessToken = this.generateToken(user, true);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      return { verified: true };
    }

    if (
      user.emailVerificationCode !== code ||
      !user.emailVerificationExpiry ||
      user.emailVerificationExpiry < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiry = null;
    await this.userRepository.save(user);

    return { verified: true };
  }

  async requestMagicLink(magicLinkDto: MagicLinkDto) {
    const { email } = magicLinkDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true, message: 'If an account exists, a magic link has been sent.' };
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15); // 15 minutes expiry

    // Save token to user
    user.magicLinkToken = token;
    user.magicLinkExpiry = expiry;
    await this.userRepository.save(user);

    // Generate magic link URL
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const magicLink = `${baseUrl}/api/v1/auth/magic-link/verify/${token}`;

    // Send email
    await this.emailService.sendMagicLinkEmail(email, magicLink);

    return { success: true, message: 'If an account exists, a magic link has been sent.' };
  }

  async verifyMagicLink(token: string) {
    const user = await this.userRepository.findOne({
      where: { magicLinkToken: token },
    });

    if (!user || !user.magicLinkExpiry || user.magicLinkExpiry < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    // Clear magic link token
    user.magicLinkToken = null;
    user.magicLinkExpiry = null;
    user.lastLoginAt = new Date();
    user.emailVerified = true; // Auto-verify email if they can access their email
    await this.userRepository.save(user);

    // Generate JWT token
    const jwtToken = this.generateToken(user);

    return {
      userId: user.id,
      token: jwtToken,
      role: user.role,
      email: user.email,
    };
  }

  private generateToken(user: User, mfaVerified = false): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      mfa_verified: mfaVerified || !user.mfaEnabled, // If MFA not enabled, consider it verified
      sessionId: crypto.randomBytes(16).toString('hex'),
      type: 'access' as const,
    };
    return this.jwtService.sign(payload, {
      expiresIn: '15m', // Short-lived access token
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'refresh' as const,
      sessionId: crypto.randomBytes(16).toString('hex'),
    };
    return this.jwtService.sign(payload, {
      expiresIn: '7d', // Longer-lived refresh token
    });
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken) as any;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Check if user is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        throw new UnauthorizedException('Account is locked');
      }

      // Generate new tokens
      const newAccessToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update last login
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validatePassword(password: string): Promise<void> {
    // Password complexity requirements
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    if (password.length < minLength) {
      throw new ConflictException(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase || !hasLowerCase) {
      throw new ConflictException('Password must contain both uppercase and lowercase letters');
    }

    if (!hasNumbers) {
      throw new ConflictException('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      throw new ConflictException('Password must contain at least one special character (!@#$%^&*)');
    }

    // Check against common passwords (basic check)
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      throw new ConflictException('Password is too common. Please choose a stronger password');
    }
  }

  async handleFailedLogin(user: User): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLoginAt = new Date();

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      const lockDuration = 30 * 60 * 1000; // 30 minutes
      user.lockedUntil = new Date(Date.now() + lockDuration);

      // Send security alert email
      await this.emailService.sendSecurityAlert(user.email, 'Account locked due to multiple failed login attempts');
    }

    await this.userRepository.save(user);
  }

  async handleSuccessfulLogin(user: User): Promise<void> {
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
  }
}
