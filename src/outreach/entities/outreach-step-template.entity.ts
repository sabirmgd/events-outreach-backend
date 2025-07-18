import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OutreachSequence } from './outreach-sequence.entity';

@Entity()
export class OutreachStepTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OutreachSequence)
  sequence: OutreachSequence;

  @Column()
  step_number: number;

  @Column()
  channel: string; // email, linkedin_conn, linkedin_msg, follow_up

  @Column()
  day_offset: number;

  @Column('text', { nullable: true })
  subject_template: string;

  @Column('text', { nullable: true })
  body_template: string;

  @Column({ default: 1 })
  max_retries: number;
}
