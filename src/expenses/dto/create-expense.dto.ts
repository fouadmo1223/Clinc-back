import { IsDateString, IsEnum, IsMongoId, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { ExpenseCategory } from '../schemas/expense.schema';

export class CreateExpenseDto {
  @IsMongoId()
  branchId: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MinLength(1)
  description: string;

  @IsDateString()
  date: string;
}
