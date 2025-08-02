import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from '../../outreach/entities/conversation.entity';
import { CompanyPersonRole } from './company-person-role.entity';
import { Organization } from '../../organization/entities/organization.entity';

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

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  email: string;

  @Column('float', { nullable: true })
  source_confidence: number;

  @ManyToOne(() => Organization, { nullable: false })
  organization: Organization;

  @OneToMany(() => Conversation, (conversation) => conversation.person)
  conversations: Conversation[];

  @OneToMany(() => CompanyPersonRole, (role) => role.person)
  companyRoles: CompanyPersonRole[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_updated_at: Date;
}
