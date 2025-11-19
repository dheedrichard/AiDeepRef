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
}
