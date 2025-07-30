import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus } from '../enums/job-status.enum';
import { JobType } from '../enums/job-type.enum';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({
    type: 'jsonb',
    comment:
      'The initial parameters used to trigger the job, e.g., { "cities": ["SF"] }',
  })
  inputParameters: Record<string, any>;

  @Column({
    type: 'text',
    comment: 'The full, final prompt sent to the external tool',
  })
  executionPrompt: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'The raw, unmodified output from the external tool',
  })
  rawOutput: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'The structured, validated output after post-processing',
  })
  structuredOutput: Record<string, any>;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Logs any errors that occurred during the job execution',
  })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
