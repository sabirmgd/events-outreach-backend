import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity()
export class CompanySimilarity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company)
  company: Company;

  @ManyToOne(() => Company)
  similar_company: Company;

  @Column('float')
  similarity_score: number;

  @Column()
  method: string; // embedding, rule, manual
}
