/**
 * Email Log Entity
 *
 * Tracks all emails sent through the system for auditing and analytics
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EmailProvider, EmailType } from '../interfaces/email.interfaces';

@Entity('email_logs')
@Index(['userId', 'createdAt'])
@Index(['emailType', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['provider', 'createdAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255 })
  @Index()
  recipientEmail: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255, nullable: true })
  recipientName: string | null;

  @Column({ name: 'email_type', type: 'varchar', length: 50 })
  emailType: EmailType;

  @Column({ name: 'subject', type: 'varchar', length: 500 })
  subject: string;

  @Column({ name: 'provider', type: 'varchar', length: 20 })
  provider: EmailProvider;

  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  messageId: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ name: 'clicked_at', type: 'timestamp', nullable: true })
  clickedAt: Date | null;

  @Column({ name: 'bounced_at', type: 'timestamp', nullable: true })
  bouncedAt: Date | null;

  @Column({ name: 'complained_at', type: 'timestamp', nullable: true })
  complainedAt: Date | null;

  @Column({ name: 'bounce_reason', type: 'text', nullable: true })
  bounceReason: string | null;

  @Column({ name: 'complaint_reason', type: 'text', nullable: true })
  complaintReason: string | null;
}
