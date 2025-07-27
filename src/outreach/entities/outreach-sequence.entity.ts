import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { Conversation } from './conversation.entity';
import { Organization } from '../../organization/entities/organization.entity';

@Entity('outreach_sequences')
export class OutreachSequence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  objective: string; // sponsor_outreach, meeting_booking, nurture

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization;

  @OneToMany(() => Conversation, (conversation) => conversation.sequence)
  conversations: Conversation[];

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
