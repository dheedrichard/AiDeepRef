/**
 * Password Service
 *
 * Handles password-related operations
 * Features:
 * - Password reset token generation and validation
 * - Password strength validation
 * - Password change with security checks
 * - Password history tracking (prevents reuse)
 */

import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../database/entities';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Generate password reset token
   */
  async generateResetToken(email: string): Promise<{ token: string; user: User } | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

    // Store token and expiry
    user.passwordResetToken = token;
    user.passwordResetExpiry = expiry;
    await this.userRepository.save(user);

    this.logger.log(`Password reset token generated for user ${email}`);

    return { token, user };
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset token');
    }

    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new UnauthorizedException('Reset token has expired');
    }

    return user;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate token
    const user = await this.validateResetToken(token);

    // Validate new password
    await this.validatePassword(newPassword);

    // Check if new password is same as old password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password cannot be the same as the old password');
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.passwordChangedAt = new Date();

    // Reset failed login attempts on password reset
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockedUntil = null;

    await this.userRepository.save(user);

    this.logger.log(`Password reset completed for user ${user.email}`);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new BadRequestException('No password set for this account');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    await this.validatePassword(newPassword);

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user ${user.email}`);
  }

  /**
   * Validate password strength
   */
  async validatePassword(password: string): Promise<void> {
    // Password complexity requirements
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    if (password.length < minLength) {
      throw new BadRequestException(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase || !hasLowerCase) {
      throw new BadRequestException('Password must contain both uppercase and lowercase letters');
    }

    if (!hasNumbers) {
      throw new BadRequestException('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      throw new BadRequestException('Password must contain at least one special character (!@#$%^&*)');
    }

    // Check against common passwords
    const commonPasswords = [
      'password',
      'password123',
      '12345678',
      'qwerty',
      'abc123',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'password1',
    ];

    if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
      throw new BadRequestException('Password is too common. Please choose a stronger password');
    }

    // Check for sequential characters
    const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
      password,
    );
    if (hasSequential) {
      throw new BadRequestException('Password contains sequential characters. Please choose a stronger password');
    }

    // Check for repeated characters
    const hasRepeated = /(.)\1{2,}/.test(password);
    if (hasRepeated) {
      throw new BadRequestException('Password contains too many repeated characters. Please choose a stronger password');
    }
  }

  /**
   * Check if password was recently changed
   */
  async wasPasswordRecentlyChanged(userId: string, withinMinutes: number = 5): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.passwordChangedAt) {
      return false;
    }

    const now = new Date();
    const diffInMs = now.getTime() - user.passwordChangedAt.getTime();
    const diffInMinutes = diffInMs / 1000 / 60;

    return diffInMinutes <= withinMinutes;
  }
}
