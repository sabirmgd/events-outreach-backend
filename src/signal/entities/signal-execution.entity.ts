import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Signal } from './signal.entity';
import { User } from '../../user/entities/user.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('signal_executions')
export class SignalExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Signal, (signal) => signal.executions)
  @JoinColumn({ name: 'signal_id' })
  signal: Signal;

  @Column({ name: 'signal_id' })
  signalId: string;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  parameters: any;

  @Column({ type: 'jsonb', nullable: true })
  results: {
    events?: Array<{
      id: string;
      name: string;
      date: string;
      location: string;
      attendees: number;
      venue: string;
      website?: string;
    }>;
    companies?: Array<{
      id: string;
      name: string;
      domain: string;
      industry: string;
      size: string;
    }>;
    contacts?: Array<{
      id: string;
      name: string;
      title: string;
      company: string;
      email: string;
      linkedin?: string;
    }>;
    stats: {
      eventsDiscovered: number;
      companiesFound: number;
      contactsDiscovered: number;
      messagesGenerated: number;
      messagesSent: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  error: {
    message: string;
    stack?: string;
    code?: string;
  };

  @Column({ type: 'int', default: 0 })
  duration: number; // in milliseconds

  @ManyToOne(() => User)
  @JoinColumn({ name: 'executed_by' })
  executedBy: User;

  @Column({ name: 'executed_by' })
  executedById: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
