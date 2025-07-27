import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { Organization } from '../../organization/entities/organization.entity';
import { Team } from '../../organization/entities/team.entity';
import { Role } from '../../auth/entities/role.entity';
import { BaseEntity } from '../../common/entities/base.entity';

// This entity is for internal users of the system.
@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true, select: false }) // select: false is important
  password_hash: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @ManyToOne(() => Team, (team) => team.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  team: Team;

  @ManyToMany(() => Role, { cascade: true, eager: true })
  @JoinTable()
  roles: Role[];

  @Column({ type: 'varchar', nullable: true, select: false })
  invitation_token: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, select: false })
  invitation_expires_at: Date | null;
}
