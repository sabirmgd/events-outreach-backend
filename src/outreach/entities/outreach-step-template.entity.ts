import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OutreachSequence } from './outreach-sequence.entity';
import { Organization } from '../../organization/entities/organization.entity';

@Entity('outreach_step_templates')
export class OutreachStepTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OutreachSequence)
  sequence: OutreachSequence;

  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization;

  @Column()
  applies_to_stage: string;

  @Column()
  channel: string; // email, linkedin_conn, linkedin_msg, follow_up

  @Column({ nullable: true })
  channel_strategy: string;

  @Column({ default: false })
  use_ai_generation: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  message_length: 'short' | 'medium' | 'long';

  @Column()
  day_offset: number;

  @Column('text', { nullable: true })
  subject_template: string;

  @Column('text', { nullable: true })
  body_template: string;

  @Column({ default: 1 })
  max_retries: number;
}
