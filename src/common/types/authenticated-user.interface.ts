import { Role } from '../constants/roles.enum';
import { Permission } from '../constants/permissions.enum';

/**
 * Shape of `request.user` after JwtAuthGuard runs.
 * `clinicId` / `branchIds` are the tenant-isolation boundary: every
 * service method must scope its queries by these unless the user is SUPER_ADMIN.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  permissions: Permission[];
  clinicId: string | null;
  branchIds: string[];
  doctorId?: string;
  staffId?: string;
}
