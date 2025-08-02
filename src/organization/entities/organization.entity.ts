import { Column, Entity, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Team } from './team.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { Signal } from '../../signal/entities/signal.entity';
import { EmailSender } from './email-sender.entity';
import { LinkedInAccount } from './linkedin-account.entity';

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

  @OneToMany(() => Signal, (signal) => signal.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  signals: Signal[];

  @OneToMany(() => EmailSender, (sender) => sender.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  emailSenders: EmailSender[];

  @OneToMany(() => LinkedInAccount, (account) => account.organization, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  linkedInAccounts: LinkedInAccount[];
}
