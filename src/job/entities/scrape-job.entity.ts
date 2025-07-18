import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ScrapeJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_type: string; // event_list, sponsor_page, company_enrich, persona_search

  @Column({ nullable: true })
  target_url: string;

  @Column({ nullable: true })
  adapter: string; // playwright, scrapingbee, perplexity, predict_hq

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  finished_at: Date;

  @Column({ nullable: true })
  status: string;

  @Column('text', { nullable: true })
  error_msg: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
