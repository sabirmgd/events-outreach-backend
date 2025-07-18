import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Event } from './event.entity';
import { EventSource } from './event-source.entity';

@Entity()
export class EventSponsor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event)
  event: Event;

  @ManyToOne(() => Company)
  company: Company;

  @Column({ nullable: true })
  sponsor_tier: string;

  @Column({ default: false })
  is_past_sponsor: boolean;

  @ManyToOne(() => EventSource)
  source: EventSource;

  @CreateDateColumn()
  first_observed_at: Date;

  @UpdateDateColumn()
  last_observed_at: Date;
}
