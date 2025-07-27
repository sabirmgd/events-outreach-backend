import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Venue } from '@geography/entities/venue.entity';
import { City } from '@geography/entities/city.entity';
import { EventCandidate } from './event-candidate.entity';
import { Job } from '@jobs/entities/job.entity';
import { EventSponsor } from './event-sponsor.entity';
import { Organization } from '../../organization/entities/organization.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'timestamp with time zone' })
  start_dt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  end_dt: Date;

  @Column({ nullable: true })
  website_url: string;

  @ManyToOne(() => Venue, { nullable: true })
  venue: Venue;

  @ManyToOne(() => City)
  city: City;

  @Column({ default: 'planned' }) // planned, updated, canceled
  status: string;

  @ManyToOne(
    () => EventCandidate,
    (candidate) => candidate.promoted_to_events,
    {
      nullable: true,
    },
  )
  created_from_candidate: EventCandidate;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'created_from_job_id' })
  created_from_job: Job;

  @OneToMany(() => EventSponsor, (sponsor) => sponsor.event, { cascade: true })
  sponsors: EventSponsor[];

  @ManyToOne(() => Organization, (organization) => organization.events, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
