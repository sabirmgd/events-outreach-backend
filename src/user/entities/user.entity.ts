import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organization/entities/organization.entity';
import { Team } from '../../organization/entities/team.entity';
import { Role } from '../../auth/entities/role.entity';

// This entity is for internal users of the system.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'password_hash', select: false, nullable: true })
  password?: string;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable()
  roles: Role[];

  @Column({ nullable: true, select: false })
  refreshToken?: string;

  @Column({ default: false })
  is_active: boolean;

  @Column({
    name: 'invitation_token',
    nullable: true,
    type: 'varchar',
    select: false,
  })
  invitationToken?: string;

  @Column({ name: 'invitation_expires_at', nullable: true, type: 'timestamp' })
  invitationExpiresAt?: Date;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  organization?: Organization;

  @ManyToOne(() => Team, (team) => team.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  team?: Team;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
