import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface PatientJwtPayload {
  sub: string; // patientId
  clinicId: string;
}

export interface AuthenticatedPatient {
  patientId: string;
  clinicId: string;
}

/** A completely separate token audience from the staff `jwt` strategy — patients never touch the roles/permissions system. */
@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'patient-jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('jwt.patientSecret');
    if (!secret) throw new Error('PATIENT_JWT_SECRET (or JWT_SECRET) is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: PatientJwtPayload): Promise<AuthenticatedPatient> {
    if (!payload?.sub || !payload?.clinicId) throw new UnauthorizedException();
    return { patientId: payload.sub, clinicId: payload.clinicId };
  }
}
