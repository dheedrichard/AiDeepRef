import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Reference } from './reference.entity';

@Entity('bundles')
export class Bundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seekerId' })
  seeker: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Reference)
  @JoinTable({
    name: 'bundle_references',
    joinColumn: { name: 'bundleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'referenceId', referencedColumnName: 'id' },
  })
  references: Reference[];

  @Column({ unique: true })
  shareLink: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  aggregatedRCS: number | null;

  @Column({ nullable: true })
  expiryDate: Date | null;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
