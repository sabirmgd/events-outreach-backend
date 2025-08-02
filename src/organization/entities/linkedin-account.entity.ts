import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('linkedin_accounts')
export class LinkedInAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (org) => org.linkedInAccounts)
  organization: Organization;

  @Column()
  account_name: string;

  @Column({ unique: true })
  account_urn: string;

  @Column({ nullable: true })
  token: string;

  @Column({ default: 100 })
  daily_message_limit: number;

  @Column({ default: 15 })
  daily_connection_request_limit: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
