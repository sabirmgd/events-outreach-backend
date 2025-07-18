import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Meeting } from './meeting.entity';
import { Person } from '../../persona/entities/person.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class MeetingAttendee {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @ManyToOne(() => Person, { nullable: true })
  person: Person;

  @ManyToOne(() => User, { nullable: true })
  internal_user: User;

  @Column({ nullable: true })
  role: string; // host, guest, observer

  @Column({ nullable: true })
  attendance_status: string;
}
