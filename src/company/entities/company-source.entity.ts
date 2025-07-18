import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity()
export class CompanySource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company)
  company: Company;

  @Column()
  provider: string; // apollo, perplexity, manual, scraping

  @Column('jsonb', { nullable: true })
  payload_json: object;

  @CreateDateColumn()
  fetched_at: Date;
}
