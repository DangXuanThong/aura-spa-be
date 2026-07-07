import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AuthenticatedUser } from './casl-ability.factory';
import { CHECK_POLICIES_KEY, Policy, PolicyHandler } from './check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policies = this.reflector.getAllAndOverride<Policy[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policies?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return false;

    const ability = this.abilityFactory.createForUser(user);
    return policies.every((policy) =>
      typeof policy === 'function' ? policy(ability) : policy.handle(ability),
    );
  }
}
