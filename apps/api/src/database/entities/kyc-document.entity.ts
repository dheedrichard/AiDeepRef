import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'driversLicense',
  NATIONAL_ID = 'nationalId',
}

export enum VerificationStatus {
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

@Entity('kyc_documents')
export class KYCDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column()
  frontImageUrl: string;

  @Column({ nullable: true })
  backImageUrl: string;

  @Column({ nullable: true })
  selfieImageUrl: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PROCESSING,
  })
  status: VerificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  verificationData: Record<string, unknown> | null;

  @Column({ nullable: true })
  livenessScore: number;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
