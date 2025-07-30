import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Prompt } from './prompt.entity';
import { PromptEvaluation } from './prompt-evaluation.entity';

export enum PromptVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('prompt_versions')
@Index(['promptId', 'version'], { unique: true })
export class PromptVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  promptId: string;

  @Column()
  version: number;

  @Column('text')
  body: string;

  @Column({
    type: 'enum',
    enum: PromptVersionStatus,
    default: PromptVersionStatus.DRAFT,
  })
  @Index()
  status: PromptVersionStatus;

  @Column({ nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  publishedBy: string;

  @Column({ nullable: true })
  changelog: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Prompt, (prompt) => prompt.versions, {
    onDelete: 'CASCADE',
  })
  prompt: Prompt;

  @OneToMany(() => PromptEvaluation, (evaluation) => evaluation.version)
  evaluations: PromptEvaluation[];
}
