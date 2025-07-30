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

@Entity('prompt_test_cases')
export class PromptTestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  promptId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  input: Record<string, any>;

  @Column('jsonb')
  expectedOutput: Record<string, any>;

  @Column('jsonb', { nullable: true })
  variables: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Prompt, (prompt) => prompt.testCases, {
    onDelete: 'CASCADE',
  })
  prompt: Prompt;
}
