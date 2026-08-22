import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ExpenseDocument = Expense & Document;

export enum ExpenseCategory {
  RENT = 'RENT',
  SALARIES = 'SALARIES',
  SUPPLIES = 'SUPPLIES',
  UTILITIES = 'UTILITIES',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ required: true, enum: ExpenseCategory, default: ExpenseCategory.OTHER })
  category: ExpenseCategory;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ clinicId: 1, date: -1 });
