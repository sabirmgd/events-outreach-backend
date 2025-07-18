import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from './company.entity';
import { Tag } from '../../tag/entities/tag.entity';

@Entity()
export class CompanyTag {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company)
  company: Company;

  @ManyToOne(() => Tag)
  tag: Tag;
}
