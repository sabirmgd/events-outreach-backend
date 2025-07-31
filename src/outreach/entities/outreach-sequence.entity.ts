import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { Conversation } from './conversation.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { OutreachStepTemplate } from './outreach-step-template.entity';

@Entity('outreach_sequences')
export class OutreachSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  objective: string; // sponsor_outreach, meeting_booking, nurture

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization;

  @OneToMany(() => Conversation, (conversation) => conversation.sequence)
  conversations: Conversation[];

  @OneToMany(() => OutreachStepTemplate, (step) => step.sequence)
  steps: OutreachStepTemplate[];

  @Column({ type: 'text', nullable: true })
  discovery_prompt: string;

  @Column({ type: 'text', nullable: true })
  outreach_context: string;

  @Column({ type: 'jsonb', nullable: true })
  template_variables: Record<string, string>;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
