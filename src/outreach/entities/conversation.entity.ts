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

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Person, (person) => person.conversations)
  person: Person;

  @ManyToOne(() => OutreachSequence, (sequence) => sequence.conversations)
  sequence: OutreachSequence;

  @Column({ default: 'active' }) // active, closed
  status: string;

  @Column({ default: 'new' }) // new, interested, unresponsive, etc.
  stage: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
