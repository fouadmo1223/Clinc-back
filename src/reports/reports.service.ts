import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentType } from '../payments/schemas/payment.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Appointment, AppointmentDocument, AppointmentStatus } from '../appointments/schemas/appointment.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { QuerySummaryDto } from './dto/query-summary.dto';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

  async getSummary(clinicId: string, query: QuerySummaryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    const fromDay = startOfUtcDay(from);
    const toDay = startOfUtcDay(to);
    // `to` a date-only string parses as that day's UTC midnight — comparing full
    // timestamps (paidAt/createdAt) against it would exclude everything from
    // later that same day, so widen the upper bound to the end of the day.
    const toInclusive = new Date(toDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const clinicObjectId = new Types.ObjectId(clinicId);

    const branchFilter = query.branchId ? { branchId: new Types.ObjectId(query.branchId) } : {};

    const [payments, expenses, appointmentsCount, visitsCount, newPatientsCount] = await Promise.all([
      this.paymentModel.find({
        clinicId: clinicObjectId,
        ...branchFilter,
        paidAt: { $gte: from, $lte: toInclusive },
      }),
      this.expenseModel.find({ clinicId: clinicObjectId, ...branchFilter, date: { $gte: fromDay, $lte: toDay } }),
      this.appointmentModel.countDocuments({
        clinicId: clinicObjectId,
        ...branchFilter,
        date: { $gte: fromDay, $lte: toDay },
        status: { $ne: AppointmentStatus.CANCELLED },
      }),
      this.visitModel.countDocuments({ clinicId: clinicObjectId, ...branchFilter, date: { $gte: fromDay, $lte: toDay } }),
      this.patientModel.countDocuments({ clinicId: clinicObjectId, createdAt: { $gte: from, $lte: toInclusive } }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.type === PaymentType.REFUND ? -p.amount : p.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const revenueByDayMap = new Map<string, number>();
    for (const p of payments) {
      const key = startOfUtcDay(p.paidAt).toISOString().slice(0, 10);
      const delta = p.type === PaymentType.REFUND ? -p.amount : p.amount;
      revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + delta);
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

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
