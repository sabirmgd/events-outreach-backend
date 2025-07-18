import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class EventSource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event)
  event: Event;

  @Column()
  provider: string; // perplexity, predict_hq, scraping, manual

  @Column({ nullable: true })
  provider_event_uid: string;

  @Column('float', { nullable: true })
  confidence_score: number;

  @Column('jsonb', { nullable: true })
  payload_json: object;

  @CreateDateColumn()
  fetched_at: Date;
}
