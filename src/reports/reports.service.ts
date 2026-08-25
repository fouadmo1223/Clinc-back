import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentType } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Appointment, AppointmentDocument, AppointmentStatus } from '../appointments/schemas/appointment.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { scopeToBranch } from '../common/utils/branch-scope';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const REVENUE_DELTA_EXPR = {
  $cond: [{ $eq: ['$type', PaymentType.REFUND] }, { $multiply: ['$amount', -1] }, '$amount'],
};

interface PaymentFacetResult {
  total: { total: number }[];
  byDay: { _id: string; revenue: number }[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
  ) {}

  async getSummary(clinicId: string, user: AuthenticatedUser, query: QuerySummaryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    const fromDay = startOfUtcDay(from);
    const toDay = startOfUtcDay(to);
    // `to` a date-only string parses as that day's UTC midnight — comparing full
    // timestamps (paidAt/createdAt) against it would exclude everything from
    // later that same day, so widen the upper bound to the end of the day.
    const toInclusive = new Date(toDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const clinicObjectId = new Types.ObjectId(clinicId);

    // A branch-scoped staff member's reports must never include another branch's revenue —
    // resolve their effective branch scope the same way the list endpoints do, then cast to
    // ObjectId(s) since aggregation pipelines skip Mongoose's automatic string casting.
    const branchScope = scopeToBranch(user, query.branchId);
    const branchObjectId =
      typeof branchScope === 'string'
        ? new Types.ObjectId(branchScope)
        : branchScope
          ? { $in: branchScope.$in.map((id) => new Types.ObjectId(id)) }
          : undefined;

    const branchFilter = branchObjectId ? { branchId: branchObjectId } : {};

    // Payment has no branchId of its own (it belongs to an invoice, which does) — join to
    // invoices to apply the branch filter rather than matching a field that doesn't exist
    // on Payment, which previously made branch-filtered revenue always come back as 0.
    const paymentPipeline: PipelineStage[] = [
      { $match: { clinicId: clinicObjectId, paidAt: { $gte: from, $lte: toInclusive } } },
    ];
    if (branchObjectId) {
      paymentPipeline.push(
        { $lookup: { from: 'invoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
        { $unwind: '$invoice' },
        { $match: { 'invoice.branchId': branchObjectId } },
      );
    }
    paymentPipeline.push({
      $facet: {
        total: [{ $group: { _id: null, total: { $sum: REVENUE_DELTA_EXPR } } }],
        byDay: [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, revenue: { $sum: REVENUE_DELTA_EXPR } } },
          { $sort: { _id: 1 } },
        ],
      },
    });

    const [[paymentFacet], expenseTotalResult, appointmentsCount, visitsCount, newPatientsCount] = await Promise.all([
      this.paymentModel.aggregate<PaymentFacetResult>(paymentPipeline),
      this.expenseModel.aggregate<{ _id: null; total: number }>([
        { $match: { clinicId: clinicObjectId, ...branchFilter, date: { $gte: fromDay, $lte: toDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.appointmentModel.countDocuments({
        clinicId: clinicObjectId,
        ...branchFilter,
        date: { $gte: fromDay, $lte: toDay },
        status: { $ne: AppointmentStatus.CANCELLED },
      }),
      this.visitModel.countDocuments({ clinicId: clinicObjectId, ...branchFilter, date: { $gte: fromDay, $lte: toDay } }),
      this.patientModel.countDocuments({ clinicId: clinicObjectId, createdAt: { $gte: from, $lte: toInclusive } }),
    ]);

    const totalRevenue = paymentFacet?.total[0]?.total ?? 0;
    const totalExpenses = expenseTotalResult[0]?.total ?? 0;
    const revenueByDay = (paymentFacet?.byDay ?? []).map((d) => ({ date: d._id, revenue: d.revenue }));

    return {
      from: fromDay.toISOString().slice(0, 10),
      to: toDay.toISOString().slice(0, 10),
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      appointmentsCount,
      visitsCount,
      newPatientsCount,
      revenueByDay,
    };
  }
}
