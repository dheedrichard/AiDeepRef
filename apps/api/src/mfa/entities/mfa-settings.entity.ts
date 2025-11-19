import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';

export enum MfaMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
}

@Entity('user_mfa_settings')
@Index(['userId', 'enabled'])
export class MfaSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MfaMethod,
    default: MfaMethod.TOTP,
  })
  method: MfaMethod;

  @Column({ type: 'text', nullable: true })
  secret: string | null;

  @Column({ name: 'backup_codes', type: 'text', nullable: true })
  backupCodes: string | null; // JSON array of hashed backup codes

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
