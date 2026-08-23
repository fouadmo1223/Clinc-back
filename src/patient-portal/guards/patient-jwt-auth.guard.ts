import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Every /patient-portal/* route is marked @Public() (so the global staff JwtAuthGuard no-ops
 * on it), then this guard is applied locally to actually enforce the patient-jwt token.
 */
@Injectable()
export class PatientJwtAuthGuard extends AuthGuard('patient-jwt') {}
