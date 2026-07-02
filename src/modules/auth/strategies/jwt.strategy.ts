import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/modules/user/user.service';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string; // user id
  email: string | null;
  role: string;
  branchId?: string | null;
  branchCode?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: (req: any) => {
        // HttpOnly cookie takes priority; fall back to Authorization header for legacy clients
        const cookie = req?.cookies?.['access_token'] as string | undefined;
        if (cookie) return cookie;
        return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      },
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Extract raw token to check against blacklist
    const cookie = req?.cookies?.['access_token'] as string | undefined;
    const rawToken = cookie ?? ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken && this.authService.isTokenBlacklisted(rawToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // branchId/branchCode are embedded in the JWT at login — avoids a second DB query on every request
    user.branchId = payload.branchId ?? null;
    user.branchCode = payload.branchCode ?? null;

    return user;
  }
}
