import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { AISession } from './ai-session.entity';
import { AIPrompt } from './ai-prompt.entity';
import { AIFinetuneDataset } from './ai-finetune-dataset.entity';

@Entity('ai_interactions')
@Index(['sessionId'])
@Index(['promptId'])
@Index(['createdAt'])
export class AIInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @ManyToOne(() => AISession, (session) => session.interactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: AISession;

  @Column('uuid')
  promptId: string;

  @ManyToOne(() => AIPrompt)
  @JoinColumn({ name: 'promptId' })
  prompt: AIPrompt;

  @Column({ type: 'text' })
  userInput: string;

  @Column({ type: 'text' })
  aiResponse: string;

  @Column({ length: 100 })
  modelUsed: string;

  @Column({ type: 'int', nullable: true })
  tokensUsed: number | null;

  @Column({ type: 'int', nullable: true })
  responseTimeMs: number | null;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => AIFinetuneDataset, (dataset) => dataset.interaction)
  finetuneDataset: AIFinetuneDataset;
}
