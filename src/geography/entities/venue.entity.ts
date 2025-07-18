import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { City } from './city.entity';

@Entity()
export class Venue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => City)
  city: City;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column('float', { nullable: true })
  lat: number;

  @Column('float', { nullable: true })
  lon: number;

  @Column({ nullable: true })
  normalized_name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
