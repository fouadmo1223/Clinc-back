import { ForbiddenException } from '@nestjs/common';

/** Only `branchIds` is needed — lets patient-portal call sites pass `{ branchIds: [] }`
 * (a patient's own records are never branch-restricted) without needing a staff AuthenticatedUser. */
export type BranchScoped = { branchIds: string[] };

/**
 * Staff assigned to specific branches (a non-empty `branchIds` on their JWT) must never see
 * another branch's operational data — appointments, queue, visits, invoices, expenses. An
 * empty `branchIds` means "not restricted to a branch" (clinic owners/admins), mirroring how
 * `requireClinicId` already treats an unrestricted clinic scope.
 *
 * If the caller also passed an explicit `branchId` filter (e.g. an owner filtering the
 * dashboard by branch), it's honored as-is when the user is unrestricted, and only honored
 * for a branch-scoped user when it's one of their own branches — otherwise this returns a
 * filter that can never match, so the endpoint returns an empty result instead of silently
 * falling back to "all branches".
 */
export function scopeToBranch(user: BranchScoped, requestedBranchId?: string): string | { $in: string[] } | undefined {
  if (user.branchIds.length === 0) return requestedBranchId;
  if (requestedBranchId) {
    return user.branchIds.includes(requestedBranchId) ? requestedBranchId : { $in: [] };
  }
  return { $in: user.branchIds };
}

/** For a single already-fetched record — throws if a branch-scoped user's branches don't include it. */
export function assertBranchAccess(user: BranchScoped, branchId: string): void {
  if (user.branchIds.length > 0 && !user.branchIds.includes(branchId)) {
    throw new ForbiddenException('You do not have access to this branch');
  }
}
