import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './casl-ability.factory';

export interface PolicyHandler {
  handle(ability: AppAbility): boolean;
}

export type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export type Policy = PolicyHandler | PolicyHandlerCallback;

export const CHECK_POLICIES_KEY = 'check_policies';

export const CheckPolicies = (...handlers: Policy[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);
