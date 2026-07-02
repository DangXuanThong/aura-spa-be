import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility, InferSubjects } from '@casl/ability';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { BranchDailyAggregate } from 'src/modules/report/entities/branch-daily-aggregate.entity';
import { UserRole } from 'src/modules/user/enums/user-role.enum';

export type Subjects = InferSubjects<typeof Booking | typeof Invoice | typeof BranchDailyAggregate> | 'all';
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type AppAbility = MongoAbility<[Action, Subjects]>;

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  branchId?: string;
}

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case UserRole.Owner:
        can('manage', 'all');
        break;

      case UserRole.Manager:
        can('manage', Booking);
        can('read', Invoice);
        can('read', BranchDailyAggregate);
        break;

      case UserRole.Staff:
        can('read', Booking);
        can('update', Booking);
        can('create', Booking);
        break;

      case UserRole.Customer:
        can('create', Booking);
        can('read', Booking, { customerId: user.id });
        can('delete', Booking, { customerId: user.id });
        break;
    }

    return build();
  }
}
