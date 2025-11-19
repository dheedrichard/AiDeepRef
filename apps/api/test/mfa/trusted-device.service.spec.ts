import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustedDeviceService } from '../../src/mfa/services/trusted-device.service';
import { TrustedDevice } from '../../src/mfa/entities/trusted-device.entity';

describe('TrustedDeviceService', () => {
  let service: TrustedDeviceService;
  let repository: Repository<TrustedDevice>;

  const mockDevice = {
    id: 'device-123',
    userId: 'user-123',
    deviceFingerprint: 'fingerprint-hash',
    deviceName: 'Test Device',
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    trustedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(),
    revoked: false,
    revokedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrustedDeviceService,
        {
          provide: getRepositoryToken(TrustedDevice),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrustedDeviceService>(TrustedDeviceService);
    repository = module.get<Repository<TrustedDevice>>(getRepositoryToken(TrustedDevice));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDeviceFingerprint', () => {
    it('should create consistent fingerprint for same user agent and IP', () => {
      const fingerprint1 = service.createDeviceFingerprint('Mozilla/5.0', '127.0.0.1');
      const fingerprint2 = service.createDeviceFingerprint('Mozilla/5.0', '127.0.0.1');

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64); // SHA-256 hash is 64 hex characters
    });

    it('should create different fingerprints for different inputs', () => {
      const fingerprint1 = service.createDeviceFingerprint('Mozilla/5.0', '127.0.0.1');
      const fingerprint2 = service.createDeviceFingerprint('Chrome/91.0', '192.168.1.1');

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('trustDevice', () => {
    it('should create new trusted device', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockDevice as TrustedDevice);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDevice as TrustedDevice);

      const device = await service.trustDevice(
        'user-123',
        'Mozilla/5.0',
        '127.0.0.1',
        'Test Device',
      );

      expect(device).toBeDefined();
      expect(device.userId).toBe('user-123');
      expect(device.deviceName).toBe('Test Device');
    });

    it('should update existing device if already exists', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockDevice as TrustedDevice);
      jest.spyOn(repository, 'save').mockResolvedValue({
        ...mockDevice,
        revoked: false,
      } as TrustedDevice);

      const device = await service.trustDevice(
        'user-123',
        'Mozilla/5.0',
        '127.0.0.1',
        'Updated Device',
      );

      expect(device).toBeDefined();
      expect(device.revoked).toBe(false);
    });

    it('should set expiration to 30 days from now', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockDevice as TrustedDevice);
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue(mockDevice as TrustedDevice);

      await service.trustDevice('user-123', 'Mozilla/5.0', '127.0.0.1');

      const savedDevice = saveSpy.mock.calls[0][0];
      const expirationDiff = savedDevice.expiresAt.getTime() - Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      // Allow 1-minute tolerance
      expect(expirationDiff).toBeGreaterThan(thirtyDaysInMs - 60000);
      expect(expirationDiff).toBeLessThan(thirtyDaysInMs + 60000);
    });
  });

  describe('isTrustedDevice', () => {
    it('should return device if trusted and not expired', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockDevice as TrustedDevice);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDevice as TrustedDevice);

      const device = await service.isTrustedDevice('user-123', 'Mozilla/5.0', '127.0.0.1');

      expect(device).toBeDefined();
      expect(device?.id).toBe('device-123');
    });

    it('should return null if device not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const device = await service.isTrustedDevice('user-123', 'Mozilla/5.0', '127.0.0.1');

      expect(device).toBeNull();
    });

    it('should return null if device is expired', async () => {
      const expiredDevice = {
        ...mockDevice,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(expiredDevice as TrustedDevice);

      const device = await service.isTrustedDevice('user-123', 'Mozilla/5.0', '127.0.0.1');

      expect(device).toBeNull();
    });

    it('should update lastUsedAt when device is verified', async () => {
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue(mockDevice as TrustedDevice);
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockDevice as TrustedDevice);

      await service.isTrustedDevice('user-123', 'Mozilla/5.0', '127.0.0.1');

      expect(saveSpy).toHaveBeenCalled();
      const savedDevice = saveSpy.mock.calls[0][0];
      expect(savedDevice.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('getTrustedDevices', () => {
    it('should return all trusted devices for user', async () => {
      const devices = [mockDevice, { ...mockDevice, id: 'device-456' }];
      jest.spyOn(repository, 'find').mockResolvedValue(devices as TrustedDevice[]);

      const result = await service.getTrustedDevices('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('device-123');
    });

    it('should not return revoked devices', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockDevice] as TrustedDevice[]);

      await service.getTrustedDevices('user-123');

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revoked: false }),
        }),
      );
    });
  });

  describe('revokeTrustedDevice', () => {
    it('should revoke device successfully', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockDevice as TrustedDevice);
      const saveSpy = jest.spyOn(repository, 'save').mockResolvedValue({
        ...mockDevice,
        revoked: true,
        revokedAt: new Date(),
      } as TrustedDevice);

      const result = await service.revokeTrustedDevice('user-123', 'device-123');

      expect(result).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
      const savedDevice = saveSpy.mock.calls[0][0];
      expect(savedDevice.revoked).toBe(true);
      expect(savedDevice.revokedAt).toBeInstanceOf(Date);
    });

    it('should return false if device not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await service.revokeTrustedDevice('user-123', 'invalid-device');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllTrustedDevices', () => {
    it('should revoke all devices for user', async () => {
      const devices = [
        mockDevice,
        { ...mockDevice, id: 'device-456' },
        { ...mockDevice, id: 'device-789' },
      ];
      jest.spyOn(repository, 'find').mockResolvedValue(devices as TrustedDevice[]);
      jest.spyOn(repository, 'save').mockResolvedValue(devices as any);

      const count = await service.revokeAllTrustedDevices('user-123');

      expect(count).toBe(3);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('extractDeviceName', () => {
    it('should extract iPhone from user agent', () => {
      const name = service.extractDeviceName(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      );
      expect(name).toBe('iPhone');
    });

    it('should extract Android from user agent', () => {
      const name = service.extractDeviceName(
        'Mozilla/5.0 (Linux; Android 11)',
      );
      expect(name).toBe('Android Device');
    });

    it('should extract Windows PC from user agent', () => {
      const name = service.extractDeviceName(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );
      expect(name).toBe('Windows PC');
    });

    it('should return Unknown Device for unrecognized user agent', () => {
      const name = service.extractDeviceName('Custom/1.0');
      expect(name).toBe('Unknown Device');
    });
  });

  describe('getTrustedDeviceCount', () => {
    it('should return count of trusted devices', async () => {
      jest.spyOn(repository, 'count').mockResolvedValue(5);

      const count = await service.getTrustedDeviceCount('user-123');

      expect(count).toBe(5);
      expect(repository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            revoked: false,
          }),
        }),
      );
    });
  });
});
