import { ForbiddenException } from '@nestjs/common';
import { scopeToBranch, assertBranchAccess } from './branch-scope';

const branchA = '0'.repeat(23) + '1';
const branchB = '0'.repeat(23) + '2';
const branchC = '0'.repeat(23) + '3';

describe('scopeToBranch', () => {
  it('returns the requested branchId as-is for an unrestricted user (empty branchIds)', () => {
    expect(scopeToBranch({ branchIds: [] }, branchA)).toBe(branchA);
  });

  it('returns undefined for an unrestricted user with no requested branchId (no filter at all)', () => {
    expect(scopeToBranch({ branchIds: [] }, undefined)).toBeUndefined();
  });

  it('scopes a restricted user with no requested branchId to all of their own branches', () => {
    expect(scopeToBranch({ branchIds: [branchA, branchB] }, undefined)).toEqual({ $in: [branchA, branchB] });
  });

  it('honors a requested branchId that is one of the restricted user\'s own branches', () => {
    expect(scopeToBranch({ branchIds: [branchA, branchB] }, branchB)).toBe(branchB);
  });

  it('returns an impossible filter when a restricted user requests a branch outside their own set', () => {
    expect(scopeToBranch({ branchIds: [branchA, branchB] }, branchC)).toEqual({ $in: [] });
  });
});

describe('assertBranchAccess', () => {
  it('allows any branch for an unrestricted user', () => {
    expect(() => assertBranchAccess({ branchIds: [] }, branchC)).not.toThrow();
  });

  it('allows a branch that is in the restricted user\'s own set', () => {
    expect(() => assertBranchAccess({ branchIds: [branchA, branchB] }, branchA)).not.toThrow();
  });

  it('throws ForbiddenException for a branch outside the restricted user\'s own set', () => {
    expect(() => assertBranchAccess({ branchIds: [branchA, branchB] }, branchC)).toThrow(ForbiddenException);
  });
});
