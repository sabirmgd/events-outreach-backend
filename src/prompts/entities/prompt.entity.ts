import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { PromptVersion } from './prompt-version.entity';
import { PromptTag } from './prompt-tag.entity';
import { PromptEvaluation } from './prompt-evaluation.entity';
import { PromptTestCase } from './prompt-test-case.entity';

export enum PromptType {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
}

@Entity('prompts')
export class Prompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  key: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  @Index()
  namespace: string;

  @Column({
    type: 'enum',
    enum: PromptType,
    default: PromptType.SYSTEM,
  })
  type: PromptType;

  @Column('jsonb', { nullable: true })
  variables: Record<string, any>;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  agentMethodName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PromptVersion, (version) => version.prompt)
  versions: PromptVersion[];

  @ManyToMany(() => PromptTag, (tag) => tag.prompts)
  @JoinTable({
    name: 'prompt_tags_mapping',
    joinColumn: { name: 'prompt_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: PromptTag[];

  @OneToMany(() => PromptEvaluation, (evaluation) => evaluation.prompt)
  evaluations: PromptEvaluation[];

  @OneToMany(() => PromptTestCase, (testCase) => testCase.prompt)
  testCases: PromptTestCase[];
}
