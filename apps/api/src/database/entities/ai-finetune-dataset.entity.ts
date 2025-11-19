import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { AIInteraction } from './ai-interaction.entity';

@Entity('ai_finetune_datasets')
@Index(['interactionId'], { unique: true })
@Check('quality_score >= 1 AND quality_score <= 5')
export class AIFinetuneDataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  interactionId: string;

  @OneToOne(() => AIInteraction, (interaction) => interaction.finetuneDataset, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interactionId' })
  interaction: AIInteraction;

  @Column({ type: 'int', nullable: true })
  qualityScore: number | null;

  @Column({ type: 'text', nullable: true })
  humanFeedback: string | null;

  @Column({ default: false })
  includedInTraining: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
