import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '../../outreach/entities/conversation.entity';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  full_name: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ unique: true, nullable: true })
  linkedin_url: string;

  @Column({ nullable: true })
  seniority: string;

  @Column({ nullable: true })
  current_title: string;

  @Column({ nullable: true })
  location_text: string;

  @Column('float', { nullable: true })
  source_confidence: number;

  @OneToMany(() => Conversation, (conversation) => conversation.person)
  conversations: Conversation[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_updated_at: Date;
}
