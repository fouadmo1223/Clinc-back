import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

@Injectable()
export class ExpensesService {
  constructor(@InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>) {}

  async create(clinicId: string, user: AuthenticatedUser, dto: CreateExpenseDto) {
    return this.expenseModel.create({
      clinicId: new Types.ObjectId(clinicId),
      branchId: new Types.ObjectId(dto.branchId),
      category: dto.category,
      amount: dto.amount,
      description: dto.description,
      date: new Date(dto.date),
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  async findAll(clinicId: string, query: QueryExpensesDto) {
    const filter: FilterQuery<ExpenseDocument> = { clinicId };
    if (query.branchId) filter.branchId = query.branchId;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      // A date-only `to` parses as that day's UTC midnight — comparing the
      // full `date` timestamp against it would exclude everything from
      // later that same day, so widen the upper bound to end-of-day.
      if (query.to) range.$lte = new Date(new Date(query.to).getTime() + 24 * 60 * 60 * 1000 - 1);
      filter.date = range;
    }
    return this.expenseModel.find(filter).sort({ date: -1 });
  }

  async remove(clinicId: string, id: string) {
    const expense = await this.expenseModel.findById(id);
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    await expense.deleteOne();
    return { deleted: true };
  }
}
