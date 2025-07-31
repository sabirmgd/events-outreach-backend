import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Action } from '../enums/action.enum';
import { Subject } from '../enums/subject.enum';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({
    type: 'enum',
    enum: Action,
    default: Action.Read,
  })
  action: Action;

  @Column({
    type: 'enum',
    enum: Subject,
  })
  subject: Subject;
}
