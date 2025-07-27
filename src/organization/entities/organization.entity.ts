import { Column, Entity, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Team } from './team.entity';
import { OutreachSequence } from '../../outreach/entities/outreach-sequence.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  users: User[];

  @OneToMany(() => Team, (team) => team.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  teams: Team[];

  @OneToMany(() => OutreachSequence, (sequence) => sequence.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  outreachSequences: OutreachSequence[];
}
