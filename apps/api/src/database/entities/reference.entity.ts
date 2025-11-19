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

export enum ReferenceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum ReferenceFormat {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

@Entity('references')
export class Reference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seekerId' })
  seeker: User;

  @Column('uuid')
  referrerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column()
  referrerName: string;

  @Column()
  referrerEmail: string;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column('jsonb')
  questions: string[];

  @Column('jsonb')
  allowedFormats: ReferenceFormat[];

  @Column({ default: false })
  allowEmployerReachback: boolean;

  @Column({
    type: 'enum',
    enum: ReferenceStatus,
    default: ReferenceStatus.PENDING,
  })
  status: ReferenceStatus;

  @Column({
    type: 'enum',
    enum: ReferenceFormat,
    nullable: true,
  })
  format: ReferenceFormat | null;

  @Column({ nullable: true })
  contentUrl: string;

  @Column('jsonb', { nullable: true })
  attachments: string[] | null;

  @Column('jsonb', { nullable: true })
  responses: Record<string, string> | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rcsScore: number | null;

  @Column({ nullable: true })
  aiAuthenticityScore: number | null;

  @Column({ nullable: true })
  deepfakeProbability: number | null;

  @Column({ nullable: true })
  expiryDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  submittedAt: Date;
}
