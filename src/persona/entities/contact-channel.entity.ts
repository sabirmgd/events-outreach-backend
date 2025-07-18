import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Person } from './person.entity';

@Entity()
export class ContactChannel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Person)
  person: Person;

  @Column()
  type: string; // email, linkedin, phone

  @Column()
  value: string;

  @Column({ nullable: true })
  validation_status: string; // unknown, valid, invalid, catch_all

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_verified_at: Date;
}
