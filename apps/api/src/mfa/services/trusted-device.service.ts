import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { TrustedDevice } from '../entities/trusted-device.entity';

@Injectable()
export class TrustedDeviceService {
  private readonly logger = new Logger(TrustedDeviceService.name);
  private readonly DEVICE_TRUST_DURATION_DAYS = 30;

  constructor(
    @InjectRepository(TrustedDevice)
    private trustedDeviceRepository: Repository<TrustedDevice>,
  ) {}

  /**
   * Create device fingerprint from user agent and IP
   */
  createDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if device is trusted for user
   */
  async isTrustedDevice(
    userId: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<TrustedDevice | null> {
    const fingerprint = this.createDeviceFingerprint(userAgent, ipAddress);

    const device = await this.trustedDeviceRepository.findOne({
      where: {
        userId,
        deviceFingerprint: fingerprint,
        revoked: false,
      },
    });

    if (!device) {
      return null;
    }

    // Check if device trust has expired
    if (device.expiresAt < new Date()) {
      this.logger.log(`Device trust expired for user ${userId}`);
      return null;
    }

    // Update last used time
    device.lastUsedAt = new Date();
    await this.trustedDeviceRepository.save(device);

    return device;
  }

  /**
   * Trust a device for user
   */
  async trustDevice(
    userId: string,
    userAgent: string,
    ipAddress: string,
    deviceName?: string,
  ): Promise<TrustedDevice> {
    const fingerprint = this.createDeviceFingerprint(userAgent, ipAddress);

    // Check if device already exists
    let device = await this.trustedDeviceRepository.findOne({
      where: {
        userId,
        deviceFingerprint: fingerprint,
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.DEVICE_TRUST_DURATION_DAYS);

    if (device) {
      // Update existing device
      device.revoked = false;
      device.revokedAt = null;
      device.expiresAt = expiresAt;
      device.lastUsedAt = new Date();
      if (deviceName) {
        device.deviceName = deviceName;
      }
    } else {
      // Create new trusted device
      device = this.trustedDeviceRepository.create({
        userId,
        deviceFingerprint: fingerprint,
        deviceName,
        userAgent,
        ipAddress,
        expiresAt,
      });
    }

    const savedDevice = await this.trustedDeviceRepository.save(device);

    this.logger.log(
      `Device trusted for user ${userId}, expires at ${expiresAt.toISOString()}`,
    );

    return savedDevice;
  }

  /**
   * Get all trusted devices for user
   */
  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    return this.trustedDeviceRepository.find({
      where: {
        userId,
        revoked: false,
      },
      order: {
        lastUsedAt: 'DESC',
      },
    });
  }

  /**
   * Revoke a trusted device
   */
  async revokeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      return false;
    }

    device.revoked = true;
    device.revokedAt = new Date();
    await this.trustedDeviceRepository.save(device);

    this.logger.log(`Device ${deviceId} revoked for user ${userId}`);

    return true;
  }

  /**
   * Revoke all trusted devices for user
   */
  async revokeAllTrustedDevices(userId: string): Promise<number> {
    const devices = await this.trustedDeviceRepository.find({
      where: {
        userId,
        revoked: false,
      },
    });

    const now = new Date();
    for (const device of devices) {
      device.revoked = true;
      device.revokedAt = now;
    }

    await this.trustedDeviceRepository.save(devices);

    this.logger.log(`All devices revoked for user ${userId}. Count: ${devices.length}`);

    return devices.length;
  }

  /**
   * Clean up expired devices (should be run periodically)
   */
  async cleanupExpiredDevices(): Promise<number> {
    const result = await this.trustedDeviceRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    const count = result.affected || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired trusted devices`);
    }

    return count;
  }

  /**
   * Get trusted device count for user
   */
  async getTrustedDeviceCount(userId: string): Promise<number> {
    return this.trustedDeviceRepository.count({
      where: {
        userId,
        revoked: false,
      },
    });
  }

  /**
   * Extract device name from user agent
   */
  extractDeviceName(userAgent: string): string {
    // Simple device name extraction
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux Device';
    return 'Unknown Device';
  }
}
