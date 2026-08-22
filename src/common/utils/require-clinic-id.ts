import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

/** Every clinic-scoped route needs a concrete clinicId — only SUPER_ADMIN lacks one. */
export function requireClinicId(user: AuthenticatedUser): string {
  if (!user.clinicId) {
    throw new ForbiddenException('This action requires a clinic context');
  }
  return user.clinicId;
}
