import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../event/entities/event.entity';

@Entity()
export class OutreachSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  objective: string; // sponsor_outreach, meeting_booking, nurture

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @Column('jsonb', { nullable: true })
  company_filter_json: object;

  @Column('jsonb', { nullable: true })
  persona_filter_json: object;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
