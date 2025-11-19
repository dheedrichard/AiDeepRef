import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMFATables1732025000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_mfa_settings table
    await queryRunner.createTable(
      new Table({
        name: 'user_mfa_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['totp', 'sms', 'email'],
            default: "'totp'",
          },
          {
            name: 'secret',
            type: 'text',
            isNullable: true,
            comment: 'Encrypted TOTP secret',
          },
          {
            name: 'backup_codes',
            type: 'text',
            isNullable: true,
            comment: 'JSON array of bcrypt-hashed backup codes',
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Phone number for SMS MFA',
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create mfa_challenges table
    await queryRunner.createTable(
      new Table({
        name: 'mfa_challenges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'challenge_type',
            type: 'enum',
            enum: ['totp', 'sms', 'email'],
            default: "'totp'",
          },
          {
            name: 'code',
            type: 'varchar',
            length: '10',
            isNullable: false,
            comment: 'Hashed challenge code',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'max_attempts',
            type: 'int',
            default: 5,
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create trusted_devices table
    await queryRunner.createTable(
      new Table({
        name: 'trusted_devices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'device_fingerprint',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Hashed device fingerprint',
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'trusted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
            comment: 'Device trust expires after 30 days',
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'revoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for user_mfa_settings
    await queryRunner.createIndex(
      'user_mfa_settings',
      new TableIndex({
        name: 'IDX_user_mfa_settings_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_mfa_settings',
      new TableIndex({
        name: 'IDX_user_mfa_settings_user_enabled',
        columnNames: ['user_id', 'enabled'],
      }),
    );

    // Create indexes for mfa_challenges
    await queryRunner.createIndex(
      'mfa_challenges',
      new TableIndex({
        name: 'IDX_mfa_challenges_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'mfa_challenges',
      new TableIndex({
        name: 'IDX_mfa_challenges_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'mfa_challenges',
      new TableIndex({
        name: 'IDX_mfa_challenges_user_verified',
        columnNames: ['user_id', 'verified'],
      }),
    );

    // Create indexes for trusted_devices
    await queryRunner.createIndex(
      'trusted_devices',
      new TableIndex({
        name: 'IDX_trusted_devices_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'trusted_devices',
      new TableIndex({
        name: 'IDX_trusted_devices_fingerprint',
        columnNames: ['device_fingerprint'],
      }),
    );

    await queryRunner.createIndex(
      'trusted_devices',
      new TableIndex({
        name: 'IDX_trusted_devices_user_fingerprint',
        columnNames: ['user_id', 'device_fingerprint'],
      }),
    );

    await queryRunner.createIndex(
      'trusted_devices',
      new TableIndex({
        name: 'IDX_trusted_devices_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'user_mfa_settings',
      new TableForeignKey({
        name: 'FK_user_mfa_settings_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'mfa_challenges',
      new TableForeignKey({
        name: 'FK_mfa_challenges_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trusted_devices',
      new TableForeignKey({
        name: 'FK_trusted_devices_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('trusted_devices', 'FK_trusted_devices_user');
    await queryRunner.dropForeignKey('mfa_challenges', 'FK_mfa_challenges_user');
    await queryRunner.dropForeignKey('user_mfa_settings', 'FK_user_mfa_settings_user');

    // Drop tables
    await queryRunner.dropTable('trusted_devices', true);
    await queryRunner.dropTable('mfa_challenges', true);
    await queryRunner.dropTable('user_mfa_settings', true);
  }
}
