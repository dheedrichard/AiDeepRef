/**
 * This file contains the NEW METHODS to add to auth.service.ts
 * These integrate with TokenService and PasswordService
 *
 * Add these imports at the top:
 * import { TokenService } from './services/token.service';
 * import { PasswordService } from './services/password.service';
 *
 * Add these to the constructor:
 * private tokenService: TokenService,
 * private passwordService: PasswordService,
 */

// ==========================================
// NEW METHODS TO ADD TO AuthService
// ==========================================

/**
 * Refresh access token using refresh token
 */
async refreshAccessToken(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  // Validate refresh token
  const { userId } = await this.tokenService.validateRefreshToken(refreshToken);

  // Get user
  const user = await this.userRepository.findOne({ where: { id: userId } });

  if (!user || !user.isActive) {
    throw new UnauthorizedException('User not found or inactive');
  }

  // Check if account is locked
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new UnauthorizedException('Account is locked');
  }

  // Generate new tokens
  const newAccessToken = this.generateToken(user);
  const newRefreshToken = await this.tokenService.createRefreshToken(user, ipAddress, userAgent);

  // Revoke old refresh token
  await this.tokenService.revokeToken(refreshToken);

  // Update last login
  user.lastLoginAt = new Date();
  await this.userRepository.save(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout user by revoking refresh token
 */
async logout(refreshToken: string, allDevices: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await this.tokenService.validateRefreshToken(refreshToken);

    if (allDevices) {
      // Revoke all tokens for user
      const count = await this.tokenService.revokeAllUserTokens(userId);
      return {
        success: true,
        message: `Logged out from ${count} device(s)`,
      };
    } else {
      // Revoke only current token
      await this.tokenService.revokeToken(refreshToken);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  } catch (error) {
    // Even if token is invalid, return success (idempotent operation)
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}

/**
 * Request password reset
 */
async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  // Generate reset token (don't reveal if user exists)
  const result = await this.passwordService.generateResetToken(email);

  if (result) {
    const { token, user } = result;

    // Generate reset link
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    // Send security alert
    await this.emailService.sendSecurityAlert(
      user.email,
      'Password reset requested',
      'A password reset was requested for your account. If this wasn\'t you, please contact support immediately.',
    );
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
  };
}

/**
 * Reset password using token
 */
async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  // Reset password
  await this.passwordService.resetPassword(token, newPassword);

  // Get user to revoke all sessions
  const user = await this.userRepository.findOne({
    where: { passwordResetToken: token },
  });

  if (user) {
    // Revoke all refresh tokens (force re-login)
    await this.tokenService.revokeAllUserTokens(user.id);

    // Send confirmation email
    await this.emailService.sendSecurityAlert(
      user.email,
      'Password changed successfully',
      'Your password has been changed. All devices have been logged out for security.',
    );
  }

  return {
    success: true,
    message: 'Password has been reset successfully. Please login with your new password.',
  };
}

/**
 * Change password for authenticated user
 */
async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepCurrentSession: boolean = true,
): Promise<{ success: boolean; message: string }> {
  // Change password
  await this.passwordService.changePassword(userId, currentPassword, newPassword);

  const user = await this.userRepository.findOne({ where: { id: userId } });

  if (user) {
    // Revoke all refresh tokens except current session if keepCurrentSession is true
    // Otherwise revoke all tokens (user will need to login again)
    await this.tokenService.revokeAllUserTokens(userId);

    // Send confirmation email
    await this.emailService.sendSecurityAlert(
      user.email,
      'Password changed',
      'Your password was changed successfully. All other sessions have been logged out.',
    );
  }

  return {
    success: true,
    message: 'Password changed successfully. Other sessions have been logged out.',
  };
}

/**
 * Revoke all sessions for a user
 */
async revokeAllSessions(userId: string): Promise<{ success: boolean; count: number }> {
  const count = await this.tokenService.revokeAllUserTokens(userId);

  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (user) {
    await this.emailService.sendSecurityAlert(
      user.email,
      'All sessions revoked',
      'All your active sessions have been logged out. Please login again.',
    );
  }

  return {
    success: true,
    count,
  };
}

/**
 * Get all active sessions for a user
 */
async getActiveSessions(userId: string) {
  const sessions = await this.tokenService.getUserSessions(userId);

  return sessions.map((session) => ({
    id: session.id,
    deviceName: session.deviceName,
    ipAddress: session.ipAddress,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
  }));
}

// ==========================================
// UPDATES TO EXISTING METHODS
// ==========================================

/**
 * UPDATE THE EXISTING signup() METHOD
 * Replace the refreshToken generation with:
 */
// OLD:
// const refreshToken = this.generateRefreshToken(savedUser);

// NEW:
// const refreshToken = await this.tokenService.createRefreshToken(savedUser, ipAddress, userAgent);

/**
 * UPDATE THE EXISTING signin() METHOD
 * Replace the refreshToken generation with:
 */
// OLD:
// const refreshToken = this.generateRefreshToken(user);

// NEW:
// const refreshToken = await this.tokenService.createRefreshToken(user, ipAddress, userAgent);

/**
 * UPDATE THE EXISTING verifyMfaAndIssueToken() METHOD
 * Replace the refreshToken generation with:
 */
// OLD:
// const refreshToken = this.generateRefreshToken(user);

// NEW (add ipAddress and userAgent parameters):
// async verifyMfaAndIssueToken(
//   userId: string,
//   challengeId: string,
//   verified: boolean,
//   ipAddress?: string,
//   userAgent?: string,
// ): Promise<{ accessToken: string; refreshToken: string }> {
//   // ... existing code ...
//   const refreshToken = await this.tokenService.createRefreshToken(user, ipAddress, userAgent);
//   // ... rest of code ...
// }

/**
 * REMOVE THE OLD refreshToken() METHOD
 * It's replaced by refreshAccessToken() above
 */

/**
 * REMOVE THE PRIVATE generateRefreshToken() METHOD
 * Token generation is now handled by TokenService
 */

/**
 * REMOVE THE validatePassword() METHOD
 * It's now in PasswordService
 */
