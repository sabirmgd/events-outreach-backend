import { Injectable } from '@nestjs/common';
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { User } from '../../user/entities/user.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { Action } from '../enums/action.enum';
import { Subject } from '../enums/subject.enum';

// SUPER_ADMIN users are granted full CRUD permissions on all resources.

export type Subjects = InferSubjects<typeof User | typeof Organization> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtPayload) {
    const { can, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    if (user.roles.includes('SUPER_ADMIN')) {
      can(Action.Create, 'all');
      can(Action.Read, 'all');
      can(Action.Update, 'all');
      can(Action.Delete, 'all');
    } else if (user.organizationId && user.permissions) {
      const orgId = user.organizationId;
      user.permissions.forEach((p) => {
        if (p.subject === Subject.Organization) {
          can(p.action as Action, Organization, { id: orgId });
        }
        if (p.subject === Subject.User) {
          can(p.action as Action, User, { organization: { id: orgId } });
        }
      });
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
