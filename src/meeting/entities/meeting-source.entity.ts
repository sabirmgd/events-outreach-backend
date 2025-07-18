import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity()
export class MeetingSource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @Column('jsonb', { nullable: true })
  source_payload_json: object;

  @CreateDateColumn()
  received_at: Date;
}
