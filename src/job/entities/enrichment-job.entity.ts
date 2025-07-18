import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class EnrichmentJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_type: string; // similarity_embed, email_verify, vector_upsert

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  finished_at: Date;

  @Column({ nullable: true })
  status: string;

  @Column('jsonb', { nullable: true })
  meta_json: object;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
