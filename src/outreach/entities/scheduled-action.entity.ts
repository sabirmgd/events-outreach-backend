import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { OutreachStepTemplate } from './outreach-step-template.entity';
import { ScheduledActionStatus } from '../enums/scheduled-action-status.enum';
import { ScheduledActionChannel } from '../enums/scheduled-action-channel.enum';
import { ScheduledActionType } from '../enums/scheduled-action-type.enum';
import { EmailSender } from '../../organization/entities/email-sender.entity';
import { LinkedInAccount } from '../../organization/entities/linkedin-account.entity';

@Entity('scheduled_actions')
export class ScheduledAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.scheduledActions,
  )
  conversation: Conversation;

  @ManyToOne(() => OutreachStepTemplate)
  step: OutreachStepTemplate;

  @Column({
    type: 'enum',
    enum: ScheduledActionChannel,
  })
  channel: ScheduledActionChannel;

  @Column({
    type: 'enum',
    enum: ScheduledActionType,
  })
  action_type: ScheduledActionType;

  @Column({ type: 'timestamp with time zone' })
  scheduled_at: Date;

  @Column({
    type: 'enum',
    enum: ScheduledActionStatus,
    default: ScheduledActionStatus.PENDING,
  })
  status: ScheduledActionStatus;

  @Column({ type: 'varchar', nullable: true })
  bull_job_id: string;

  @ManyToOne(() => EmailSender, { nullable: true })
  email_sender: EmailSender;

  @ManyToOne(() => LinkedInAccount, { nullable: true })
  linkedin_account: LinkedInAccount;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
