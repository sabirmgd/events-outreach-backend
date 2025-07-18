import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('event_candidates')
export class EventCandidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  source_id: number;

  @Column()
  raw_title: string;

  @Column({ nullable: true })
  raw_start_dt: string;

  @Column({ nullable: true })
  raw_end_dt: string;

  @Column('text', { nullable: true })
  raw_html: string;

  @Column({ nullable: true })
  url: string;

  @Column({ default: 'scraped' })
  status: string; // scraped, rejected, promoted

  @OneToMany(() => Event, (event) => event.created_from_candidate)
  promoted_to_events: Event[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
