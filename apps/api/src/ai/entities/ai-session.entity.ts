import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { AIPrompt } from './ai-prompt.entity';

export enum SessionType {
  REFERENCE_COACH = 'reference_coach',
  VERIFICATION = 'verification',
  AUTHENTICITY = 'authenticity',
  BULK_ANALYSIS = 'bulk_analysis',
  QUALITY_ASSESSMENT = 'quality_assessment',
}

export enum SessionStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@Entity('ai_sessions')
@Index(['agent_id'], { unique: true })
@Index(['user_id'])
@Index(['session_type'])
@Index(['status'])
@Index(['started_at', 'ended_at'])
export class AISession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Public-facing agent identifier exposed to client' })
  agent_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { comment: 'User who owns this session' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: SessionType,
    comment: 'Session type (reference_coach, verification, etc)',
  })
  session_type: SessionType;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
    comment: 'Session status: active, idle, expired, completed, error',
  })
  status: SessionStatus;

  @ManyToOne(() => AIPrompt)
  @JoinColumn({ name: 'prompt_id' })
  prompt: AIPrompt;

  @Column({ type: 'uuid', nullable: true, comment: 'Active prompt being used for this session' })
  prompt_id: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Session metadata and context' })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'int', default: 0, comment: 'Total number of interactions in this session' })
  interaction_count: number;

  @Column({ type: 'int', default: 0, comment: 'Total tokens used in this session' })
  total_tokens_used: number;

  @Column({ type: 'float', default: 0 })
  total_cost: number;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'When the session was ended' })
  ended_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date;

  @Column({ type: 'int', default: 1800, comment: '30 minutes default idle timeout' })
  idle_timeout_seconds: number;

  @Column({ type: 'text', nullable: true })
  termination_reason: string;

  @Column({ type: 'jsonb', nullable: true })
  performance_metrics: {
    average_response_time_ms?: number;
    min_response_time_ms?: number;
    max_response_time_ms?: number;
    error_count?: number;
    success_count?: number;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => import('./ai-interaction.entity').then(m => m.AIInteraction), 'session', {
    cascade: true,
  })
  interactions: Promise<any[]>;

  /**
   * Check if session is expired based on idle timeout
   */
  isExpired(): boolean {
    if (this.status !== SessionStatus.ACTIVE) {
      return true;
    }

    if (!this.last_activity_at) {
      return false;
    }

    const idleTimeMs = Date.now() - this.last_activity_at.getTime();
    const idleTimeoutMs = this.idle_timeout_seconds * 1000;

    return idleTimeMs > idleTimeoutMs;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity() {
    this.last_activity_at = new Date();
    this.interaction_count++;
  }

  /**
   * Calculate total session duration
   */
  getDuration(): number {
    const endTime = this.ended_at || new Date();
    return endTime.getTime() - this.started_at.getTime();
  }

  /**
   * End the session
   */
  endSession(reason?: string) {
    this.ended_at = new Date();
    this.status = SessionStatus.COMPLETED;
    if (reason) {
      this.termination_reason = reason;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(responseTimeMs: number, success: boolean) {
    if (!this.performance_metrics) {
      this.performance_metrics = {};
    }

    const metrics = this.performance_metrics;

    // Update response time metrics
    if (metrics.average_response_time_ms) {
      const totalTime = metrics.average_response_time_ms * (this.interaction_count - 1);
      metrics.average_response_time_ms = (totalTime + responseTimeMs) / this.interaction_count;
    } else {
      metrics.average_response_time_ms = responseTimeMs;
    }

    if (!metrics.min_response_time_ms || responseTimeMs < metrics.min_response_time_ms) {
      metrics.min_response_time_ms = responseTimeMs;
    }

    if (!metrics.max_response_time_ms || responseTimeMs > metrics.max_response_time_ms) {
      metrics.max_response_time_ms = responseTimeMs;
    }

    // Update success/error counts
    if (success) {
      metrics.success_count = (metrics.success_count || 0) + 1;
    } else {
      metrics.error_count = (metrics.error_count || 0) + 1;
    }

    this.performance_metrics = metrics;
  }
}
