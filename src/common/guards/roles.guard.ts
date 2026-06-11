import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ERROR_CODES } from '../constants/error-codes';
import { User } from 'src/modules/user/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), // method-level @Roles() takes priority
      context.getClass(), // then class-level @Roles()
    ]);

    // No @Roles() decorator — route is open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new HttpException({ code: ERROR_CODES.FORBIDDEN, message: 'You do not have permission to perform this action' }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
