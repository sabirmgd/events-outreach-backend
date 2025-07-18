import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Person } from './person.entity';

@Entity()
export class CompanyPersonRole {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company)
  company: Company;

  @ManyToOne(() => Person)
  person: Person;

  @Column({ nullable: true })
  role_title: string;

  @Column({ nullable: true })
  role_category: string; // marketing, sales, partnerships, c_level, other

  @Column({ default: false })
  is_decision_maker: boolean;

  @Column({ nullable: true })
  start_date: Date;

  @Column({ nullable: true })
  end_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
