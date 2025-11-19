import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fine_tune_exports')
export class FineTuneExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Session type this export is for',
  })
  session_type: string;

  @Column({
    type: 'jsonb',
    comment: 'Filter criteria used for export',
  })
  filters: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Path to exported dataset file',
  })
  file_path: string;

  @Column({
    type: 'int',
    comment: 'Number of interactions included in export',
  })
  interaction_count: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Export status: pending, processing, completed, failed',
  })
  status: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if export failed',
  })
  error_message: string;

  @Column({
    type: 'uuid',
    comment: 'User who initiated the export',
  })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
