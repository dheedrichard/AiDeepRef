/**
 * USER ENTITY UPDATES
 * Add these fields to /home/user/AiDeepRef/apps/api/src/database/entities/user.entity.ts
 *
 * Add these @Column decorators to the User class:
 */

@Column({ nullable: true })
passwordResetToken: string | null;

@Column({ nullable: true })
passwordResetExpiry: Date | null;

@Column({ nullable: true })
passwordChangedAt: Date | null;

/**
 * COMPLETE UPDATED User entity (for reference):
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  SEEKER = 'seeker',
  REFERRER = 'referrer',
  EMPLOYER = 'employer',
}

export enum KYCStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  kycStatus: KYCStatus;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationCode: string | null;

  @Column({ nullable: true })
  emailVerificationExpiry: Date | null;

  @Column({ nullable: true })
  magicLinkToken: string | null;

  @Column({ nullable: true })
  magicLinkExpiry: Date | null;

  // NEW FIELDS
  @Column({ nullable: true })
  passwordResetToken: string | null;

  @Column({ nullable: true })
  passwordResetExpiry: Date | null;

  @Column({ nullable: true })
  passwordChangedAt: Date | null;
  // END NEW FIELDS

  @Column({ nullable: true })
  profilePictureUrl: string | null;

  @Column({ nullable: true })
  phoneNumber: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date | null;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lastFailedLoginAt: Date | null;

  @Column({ nullable: true })
  lockedUntil: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  kycCompleted: boolean;

  @Column({ default: false })
  mfaEnabled: boolean;
}
