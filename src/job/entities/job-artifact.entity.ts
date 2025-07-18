import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScrapeJob } from './scrape-job.entity';

@Entity()
export class JobArtifact {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ScrapeJob)
  scrape_job: ScrapeJob;

  @Column()
  artifact_type: string; // html, json, screenshot, text

  @Column()
  storage_path: string;

  @Column({ nullable: true })
  size_bytes: number;

  @Column({ nullable: true })
  sha256: string;

  @CreateDateColumn()
  created_at: Date;
}
