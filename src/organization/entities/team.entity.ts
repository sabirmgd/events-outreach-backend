import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('teams')
export class Team extends BaseEntity {
  @ManyToOne(() => Organization, (organization) => organization.teams, {
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @Column()
  name: string;

  @OneToMany(() => User, (user) => user.team, { cascade: true })
  members: User[];
}
