import { Person } from '../../persona/entities/person.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from './message.entity';
import { OutreachSequence } from './outreach-sequence.entity';
import { ConversationStage } from '../enums/conversation-stage.enum';
import { ConversationAutomationStatus } from '../enums/conversation-automation-status.enum';
import { ProspectTemperature } from '../enums/prospect-temperature.enum';
import { OutreachStepTemplate } from './outreach-step-template.entity';
import { ScheduledAction } from './scheduled-action.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Person, (person) => person.conversations)
  person: Person;

  @ManyToOne(() => OutreachSequence, (sequence) => sequence.conversations)
  sequence: OutreachSequence;

  @Column({
    type: 'enum',
    enum: ConversationAutomationStatus,
    default: ConversationAutomationStatus.ACTIVE,
  })
  automation_status: ConversationAutomationStatus;

  @Column({
    type: 'enum',
    enum: ConversationStage,
    default: ConversationStage.NEW,
  })
  stage: ConversationStage;

  @Column({
    type: 'enum',
    enum: ProspectTemperature,
    nullable: true,
  })
  temperature: ProspectTemperature;

  @ManyToOne(() => OutreachStepTemplate, { nullable: true })
  current_step: OutreachStepTemplate;

  @ManyToOne(() => OutreachStepTemplate, { nullable: true })
  last_step_sent: OutreachStepTemplate;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_action_at: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => ScheduledAction, (action) => action.conversation)
  scheduledActions: ScheduledAction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
