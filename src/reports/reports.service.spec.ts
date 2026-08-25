import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let paymentModel: { aggregate: jest.Mock };
  let expenseModel: { aggregate: jest.Mock };
  let appointmentModel: { countDocuments: jest.Mock };
  let visitModel: { countDocuments: jest.Mock };
  let patientModel: { countDocuments: jest.Mock };

  const clinicId = '0'.repeat(23) + '1';
  const branchId = '0'.repeat(23) + '2';
  const otherBranchId = '0'.repeat(23) + '3';
  const unrestrictedUser = { branchIds: [] } as never;

  beforeEach(() => {
    paymentModel = {
      aggregate: jest.fn().mockResolvedValue([{ total: [{ total: 750 }], byDay: [{ _id: '2026-08-24', revenue: 750 }] }]),
    };
    expenseModel = { aggregate: jest.fn().mockResolvedValue([{ _id: null, total: 9370 }]) };
    appointmentModel = { countDocuments: jest.fn().mockResolvedValue(11) };
    visitModel = { countDocuments: jest.fn().mockResolvedValue(4) };
    patientModel = { countDocuments: jest.fn().mockResolvedValue(13) };

    service = new ReportsService(
      paymentModel as never,
      expenseModel as never,
      appointmentModel as never,
      visitModel as never,
      patientModel as never,
    );
  });

  it('computes totals and revenueByDay from the payment aggregation facet', async () => {
    const result = await service.getSummary(clinicId, unrestrictedUser, { from: '2026-01-01', to: '2026-12-31' } as never);

    expect(result.totalRevenue).toBe(750);
    expect(result.totalExpenses).toBe(9370);
    expect(result.netIncome).toBe(750 - 9370);
    expect(result.revenueByDay).toEqual([{ date: '2026-08-24', revenue: 750 }]);
  });

  it('does not add a branch $lookup stage to the payment pipeline when no branchId is given', async () => {
    await service.getSummary(clinicId, unrestrictedUser, { from: '2026-01-01', to: '2026-12-31' } as never);

    const pipeline = paymentModel.aggregate.mock.calls[0][0];
    expect(pipeline.some((stage: Record<string, unknown>) => '$lookup' in stage)).toBe(false);
  });

  it('joins to invoices to filter payments by branch, since Payment has no branchId of its own', async () => {
    await service.getSummary(clinicId, unrestrictedUser, { from: '2026-01-01', to: '2026-12-31', branchId } as never);

    const pipeline = paymentModel.aggregate.mock.calls[0][0];
    const lookupStage = pipeline.find((stage: Record<string, unknown>) => '$lookup' in stage) as
      | { $lookup: { from: string; localField: string; foreignField: string } }
      | undefined;
    expect(lookupStage?.$lookup).toEqual(
      expect.objectContaining({ from: 'invoices', localField: 'invoiceId', foreignField: '_id' }),
    );

    const branchMatchStage = pipeline.find(
      (stage: Record<string, unknown>) => '$match' in stage && 'invoice.branchId' in (stage.$match as Record<string, unknown>),
    );
    expect(branchMatchStage).toBeDefined();
  });

  it('returns zeroed totals when the payment facet has no matching rows', async () => {
    paymentModel.aggregate.mockResolvedValue([{ total: [], byDay: [] }]);

    const result = await service.getSummary(clinicId, unrestrictedUser, { from: '2026-01-01', to: '2026-12-31' } as never);

    expect(result.totalRevenue).toBe(0);
    expect(result.revenueByDay).toEqual([]);
  });

  it('scopes a branch-restricted user to their own branch even with no branchId query param', async () => {
    const scopedUser = { branchIds: [branchId] } as never;

    await service.getSummary(clinicId, scopedUser, { from: '2026-01-01', to: '2026-12-31' } as never);

    const pipeline = paymentModel.aggregate.mock.calls[0][0];
    const lookupStage = pipeline.some((stage: Record<string, unknown>) => '$lookup' in stage);
    expect(lookupStage).toBe(true);

    const [expenseMatch] = expenseModel.aggregate.mock.calls[0][0];
    expect((expenseMatch.$match as Record<string, unknown>).branchId).toEqual(expect.anything());
  });

  it('never lets a branch-restricted user pull another branch\'s data via the branchId query param', async () => {
    const scopedUser = { branchIds: [branchId] } as never;

    await service.getSummary(clinicId, scopedUser, { from: '2026-01-01', to: '2026-12-31', branchId: otherBranchId } as never);

    const [expenseMatch] = expenseModel.aggregate.mock.calls[0][0];
    const matchedBranchId = (expenseMatch.$match as Record<string, { $in: unknown[] }>).branchId;
    // scopeToBranch returns an impossible {$in: []} when the requested branch isn't theirs.
    expect(matchedBranchId.$in).toEqual([]);
  });
});
