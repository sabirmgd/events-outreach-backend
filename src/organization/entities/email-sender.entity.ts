import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('email_senders')
export class EmailSender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (org) => org.emailSenders)
  organization: Organization;

  @Column()
  from_name: string;

  @Column()
  from_email: string;

  @Column({ nullable: true })
  sendgrid_key: string;

  @Column({ default: 400 })
  daily_limit: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
