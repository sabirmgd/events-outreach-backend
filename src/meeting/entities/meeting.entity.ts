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

@Entity()
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @ManyToOne(() => Company, { nullable: true })
  company: Company;

  @Column()
  scheduled_start_dt: Date;

  @Column({ nullable: true })
  scheduled_end_dt: Date;

  @Column({ nullable: true })
  booking_source: string; // cal_com, manual, reply_link

  @Column({ default: 'scheduled' })
  status: string; // scheduled, completed, canceled

  @Column({ nullable: true })
  meeting_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
