import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Permission } from './permission.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, { cascade: true, eager: true })
  @JoinTable()
  permissions: Permission[];
}
