import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Event } from '../../event/entities/event.entity';
import { Person } from '../../persona/entities/person.entity';
import { OutreachSequence } from './outreach-sequence.entity';
import { OutreachStepTemplate } from './outreach-step-template.entity';

@Entity()
export class OutreachMessageInstance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Person)
  person: Person;

  @ManyToOne(() => Company)
  company: Company;

  @ManyToOne(() => OutreachSequence)
  sequence: OutreachSequence;

  @ManyToOne(() => OutreachStepTemplate)
  step_template: OutreachStepTemplate;

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @Column({ default: 'pending' })
  status: string; // pending, rendered, scheduled, sent, replied, bounced, failed

  @Column({ nullable: true })
  scheduled_at: Date;

  @Column({ nullable: true })
  sent_at: Date;

  @Column({ nullable: true })
  replied_at: Date;

  @Column('text', { nullable: true })
  subject_rendered: string;

  @Column('text', { nullable: true })
  body_rendered: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
