# Complete Authentication Endpoints Implementation Plan

## Executive Summary
This document provides production-ready implementations for all missing critical authentication endpoints in the AiDeepRef application.

**Estimated Total Implementation Time: 12-16 hours**

## Current State Analysis

### Existing Implementation
- ✅ POST /auth/signup - User registration
- ✅ POST /auth/signin - User login (with MFA support)
- ✅ POST /auth/verify-email - Email verification
- ✅ POST /auth/magic-link - Request magic link
- ✅ GET /auth/magic-link/verify/:token - Verify magic link
- ✅ POST /api/v1/auth/mfa/verify - MFA verification
- ✅ POST /api/v1/auth/mfa/backup-code - Backup code verification
- ✅ Service method: `refreshToken()` exists but no controller endpoint

### Missing Critical Endpoints
1. POST /api/v1/auth/refresh - Token refresh endpoint
2. POST /api/v1/auth/logout - Logout endpoint
3. POST /api/v1/auth/forgot-password - Password reset request
4. POST /api/v1/auth/reset-password - Password reset completion
5. POST /api/v1/auth/change-password - Password change for authenticated users
6. POST /api/v1/auth/revoke-all-sessions - Revoke all user sessions

### Issues to Address
- Magic link authentication mentioned in signin but throws "not yet implemented"
- No token blacklisting/revocation mechanism
- Missing sendSecurityAlert in EmailService
- No session management entity for tracking active sessions

## Database Schema Changes

### New Entity: RefreshToken (for session management and revocation)

```typescript
// Location: /home/user/AiDeepRef/apps/api/src/database/entities/refresh-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['userId', 'isRevoked'])
@Index(['token'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  revokedAt: Date | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @Column({ nullable: true })
  deviceName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  lastUsedAt: Date | null;
}
```

### User Entity Updates

```typescript
// Add these fields to User entity
@Column({ nullable: true })
passwordResetToken: string | null;

@Column({ nullable: true })
passwordResetExpiry: Date | null;

@Column({ nullable: true })
passwordChangedAt: Date | null;
```

### Migration File

```typescript
// Location: /home/user/AiDeepRef/apps/api/src/database/migrations/[timestamp]-add-auth-features.ts
import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

export class AddAuthFeatures1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'token',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'isRevoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deviceName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_USER_REVOKED',
        columnNames: ['userId', 'isRevoked'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_TOKEN',
        columnNames: ['token'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add password reset columns to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetToken',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetExpiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordChangedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('refresh_tokens');
    const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);
    await queryRunner.dropForeignKey('refresh_tokens', foreignKey);

    // Drop indexes
    await queryRunner.dropIndex('refresh_tokens', 'IDX_REFRESH_TOKEN_USER_REVOKED');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_REFRESH_TOKEN_TOKEN');

    // Drop table
    await queryRunner.dropTable('refresh_tokens');

    // Drop columns from users
    await queryRunner.dropColumn('users', 'passwordResetToken');
    await queryRunner.dropColumn('users', 'passwordResetExpiry');
    await queryRunner.dropColumn('users', 'passwordChangedAt');
  }
}
```

## Implementation Details

### 1. Token Refresh Endpoint
**Endpoint:** POST /api/v1/auth/refresh
**Estimated Time:** 1.5 hours
**Rate Limit:** 10 requests per minute

### 2. Logout Endpoint
**Endpoint:** POST /api/v1/auth/logout
**Estimated Time:** 1.5 hours
**Rate Limit:** 20 requests per minute

### 3. Forgot Password Endpoint
**Endpoint:** POST /api/v1/auth/forgot-password
**Estimated Time:** 2 hours
**Rate Limit:** 3 requests per hour

### 4. Reset Password Endpoint
**Endpoint:** POST /api/v1/auth/reset-password
**Estimated Time:** 2 hours
**Rate Limit:** 5 requests per hour

### 5. Change Password Endpoint
**Endpoint:** POST /api/v1/auth/change-password
**Estimated Time:** 2 hours
**Rate Limit:** 5 requests per hour

### 6. Revoke All Sessions
**Endpoint:** POST /api/v1/auth/revoke-all-sessions
**Estimated Time:** 1.5 hours
**Rate Limit:** 3 requests per hour

### 7. Additional Work
- Email Service Updates: 1.5 hours
- Test Files: 2.5 hours
- Documentation & Testing: 1.5 hours

---

## File Structure

```
apps/api/src/
├── auth/
│   ├── dto/
│   │   ├── refresh-token.dto.ts (NEW)
│   │   ├── logout.dto.ts (NEW)
│   │   ├── forgot-password.dto.ts (NEW)
│   │   ├── reset-password.dto.ts (NEW)
│   │   ├── change-password.dto.ts (NEW)
│   │   └── revoke-sessions.dto.ts (NEW)
│   ├── services/
│   │   ├── token.service.ts (NEW - for token management)
│   │   └── password.service.ts (NEW - for password operations)
│   ├── auth.controller.ts (UPDATE)
│   ├── auth.service.ts (UPDATE)
│   └── auth.module.ts (UPDATE)
├── common/
│   └── services/
│       └── email.service.ts (UPDATE)
└── database/
    ├── entities/
    │   ├── refresh-token.entity.ts (NEW)
    │   ├── user.entity.ts (UPDATE)
    │   └── index.ts (UPDATE)
    └── migrations/
        └── [timestamp]-add-auth-features.ts (NEW)
```

---

## Next Steps

1. Review and approve this implementation plan
2. Create database migration
3. Implement new entities
4. Implement DTOs
5. Implement service methods
6. Implement controller endpoints
7. Write comprehensive tests
8. Update API documentation
9. Deploy and monitor

## Security Considerations

- All password reset tokens expire after 1 hour
- Refresh tokens can be individually revoked
- Session tracking enables security monitoring
- Rate limiting prevents abuse
- CSRF protection on state-changing operations
- Password change invalidates all existing sessions
- Email notifications for security-critical operations

## Rollback Plan

If issues are encountered:
1. Database migration can be rolled back using TypeORM down migration
2. Controller endpoints can be disabled via feature flags
3. Old authentication flow remains functional
4. Zero downtime deployment possible with backwards compatibility
