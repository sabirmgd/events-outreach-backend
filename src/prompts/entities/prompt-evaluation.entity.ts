import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Prompt } from './prompt.entity';
import { PromptVersion } from './prompt-version.entity';

export enum EvaluationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('prompt_evaluations')
export class PromptEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  promptId: string;

  @Column()
  @Index()
  versionId: string;

  @Column({
    type: 'enum',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  status: EvaluationStatus;

  @Column('jsonb')
  input: Record<string, any>;

  @Column('jsonb', { nullable: true })
  output: Record<string, any>;

  @Column('jsonb', { nullable: true })
  variables: Record<string, any>;

  @Column({ nullable: true })
  executionTime: number;

  @Column({ nullable: true })
  tokenCount: number;

  @Column('float', { nullable: true })
  cost: number;

  @Column('float', { nullable: true })
  qualityScore: number;

  @Column({ nullable: true })
  error: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  agentMethodName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Prompt, (prompt) => prompt.evaluations, {
    onDelete: 'CASCADE',
  })
  prompt: Prompt;

  @ManyToOne(() => PromptVersion, (version) => version.evaluations, {
    onDelete: 'CASCADE',
  })
  version: PromptVersion;
}
