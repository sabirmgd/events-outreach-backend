import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SignalExecution } from './signal-execution.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { OutreachSequence } from '../../outreach/entities/outreach-sequence.entity';
import { Event } from '../../event/entities/event.entity';

export enum SignalType {
  CONFERENCE = 'conference',
  FUNDING = 'funding',
  HIRING = 'hiring',
  PRODUCT_LAUNCH = 'product_launch',
  ACQUISITION = 'acquisition',
  EVENT = 'event',
}

export enum SignalStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum SignalFrequency {
  ON_DEMAND = 'on-demand',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('signals')
export class Signal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SignalType,
  })
  type: SignalType;

  @Column({
    type: 'enum',
    enum: SignalStatus,
    default: SignalStatus.ACTIVE,
  })
  status: SignalStatus;

  @Column({ type: 'jsonb' })
  configuration: {
    // Conference type
    event_type?: string;
    event_keywords?: string[];
    min_attendees?: number;
    max_attendees?: number;
    locations?: string[];
    industries?: string[];
    target_functions?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    extract_sponsors?: boolean;

    // Funding type
    funding_stage?: string;
    min_amount?: number;
    max_amount?: number;
    days_since_funding?: number;

    // Hiring type
    positions?: string[];
    seniority?: string;
    departments?: string[];
    days_since_posted?: number;

    // Common
    geographies?: string[];
    company_size?: string[];
    technologies?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    frequency: SignalFrequency;
    time?: string;
    timezone?: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    totalExecutions: number;
    totalEventsFound: number;
    totalCompaniesIdentified: number;
    totalContactsDiscovered: number;
    totalMessagesSent: number;
    totalResponses: number;
    totalMeetingsBooked: number;
    lastExecuted?: Date;
  };

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => Organization, (organization) => organization.signals, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @OneToMany(() => SignalExecution, (execution) => execution.signal)
  executions: SignalExecution[];

  @OneToMany(() => OutreachSequence, (sequence) => sequence.signal)
  outreachSequences: OutreachSequence[];

  @OneToMany(() => Event, (event) => event.signal)
  events: Event[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
