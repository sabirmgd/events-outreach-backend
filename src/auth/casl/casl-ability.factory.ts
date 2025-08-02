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
import { Event } from '../../event/entities/event.entity';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { Prompt } from '../../prompts/entities/prompt.entity';
import { Action } from '../enums/action.enum';
import { Signal } from '../../signal/entities/signal.entity';

export type Subjects =
  | InferSubjects<
      | typeof User
      | typeof Organization
      | typeof Event
      | typeof Prompt
      | typeof Signal
    >
  | 'Company'
  | 'Persona'
  | 'Agent'
  | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtPayload) {
    const { can, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    const orgId = user.organizationId;

    // Define permissions based on roles
    user.roles.forEach((role) => {
      switch (role) {
        case 'SUPER_ADMIN':
          can(Action.Manage, 'all');
          // Explicitly grant all specific actions for clarity
          can(
            [Action.Create, Action.Read, Action.Update, Action.Delete],
            'all',
          );
          break;

        case 'ADMIN':
          if (orgId) {
            can(Action.Manage, Event, {
              signal: { organizationId: orgId },
            } as any);
            can(Action.Manage, 'Company');
            can(Action.Manage, 'Persona');
            can(Action.Manage, Signal, { organizationId: orgId } as any);
            can(Action.Manage, Prompt, { organization: { id: orgId } } as any);
            can(Action.Manage, 'Agent');
            can(Action.Read, Organization, { id: orgId });
            can(Action.Update, Organization, { id: orgId });
            can(Action.Manage, User, { organization: { id: orgId } } as any);
          }
          break;
        case 'USER':
          if (orgId) {
            can(Action.Manage, Event, {
              signal: { organizationId: orgId },
            } as any);
            can(Action.Manage, 'Company');
            can(Action.Manage, 'Persona');
            can(Action.Manage, Signal, { organizationId: orgId } as any);
            can(Action.Read, Prompt, { organization: { id: orgId } } as any);
            can(Action.Read, 'Agent');
            can([Action.Create, Action.Update], 'Agent');
            can(Action.Read, Organization, { id: orgId });
            can(Action.Read, User, { organization: { id: orgId } } as any);
            can(Action.Update, User, { id: user.sub });
          }
          break;
      }
    });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
