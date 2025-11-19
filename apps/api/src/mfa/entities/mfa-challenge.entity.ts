import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';

export enum ChallengeType {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
}

@Entity('mfa_challenges')
@Index(['userId', 'verified'])
@Index(['expiresAt'])
export class MfaChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'challenge_type',
    type: 'enum',
    enum: ChallengeType,
    default: ChallengeType.TOTP,
  })
  challengeType: ChallengeType;

  @Column({ type: 'varchar', length: 10 })
  code: string; // Hashed challenge code

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
