import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_prompts')
@Index(['promptId'], { unique: true })
export class AIPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  promptId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  systemPrompt: string; // Will be encrypted at application level

  @Column({ type: 'text', nullable: true })
  userPromptTemplate: string | null;

  @Column({ length: 20 })
  version: string;

  @Column({ length: 50 })
  modelPreference: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
