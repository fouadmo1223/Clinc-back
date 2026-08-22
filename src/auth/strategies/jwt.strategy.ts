import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
  permissions: AuthenticatedUser['permissions'];
  clinicId: string | null;
  branchIds: string[];
  doctorId?: string;
  staffId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('jwt.secret');
    if (!secret) throw new Error('JWT_SECRET is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) throw new UnauthorizedException();
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      clinicId: payload.clinicId,
      branchIds: payload.branchIds ?? [],
      doctorId: payload.doctorId,
      staffId: payload.staffId,
    };
  }
}
