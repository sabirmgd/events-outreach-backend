import { City } from '../../geography/entities/city.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventSponsor } from '../../event/entities/event-sponsor.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  legal_name: string;

  @Column({ unique: true, nullable: true })
  website: string;

  @Column({ nullable: true })
  linkedin_url: string;

  @Column({ nullable: true })
  crunchbase_url: string;

  @ManyToOne(() => City, { nullable: true })
  hq_city: City;

  @Column({ nullable: true })
  employee_range: string;

  @Column({ nullable: true })
  revenue_range: string;

  @Column({ nullable: true })
  primary_industry: string;

  @Column('text', { nullable: true })
  description: string;

  @Index({ fulltext: true })
  @Column({ type: 'tsvector', select: false, nullable: true })
  document_with_weights: any;

  @OneToMany(() => EventSponsor, (sponsor) => sponsor.company)
  eventSponsors: EventSponsor[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
