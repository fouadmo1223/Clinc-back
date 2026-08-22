import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ScheduleExceptionDocument = ScheduleException & Document;

export enum ScheduleExceptionType {
  FULL_DAY_LEAVE = 'FULL_DAY_LEAVE',
  PARTIAL_DAY_LEAVE = 'PARTIAL_DAY_LEAVE',
  CUSTOM_HOURS = 'CUSTOM_HOURS',
  EXTRA_HOURS = 'EXTRA_HOURS',
  HOLIDAY = 'HOLIDAY',
  EMERGENCY_CLOSURE = 'EMERGENCY_CLOSURE',
  BLOCKED_TIME = 'BLOCKED_TIME',
}

const FULL_DAY_TYPES = [
  ScheduleExceptionType.FULL_DAY_LEAVE,
  ScheduleExceptionType.HOLIDAY,
  ScheduleExceptionType.EMERGENCY_CLOSURE,
];

const RANGE_TYPES = [
  ScheduleExceptionType.PARTIAL_DAY_LEAVE,
  ScheduleExceptionType.CUSTOM_HOURS,
  ScheduleExceptionType.EXTRA_HOURS,
  ScheduleExceptionType.BLOCKED_TIME,
];

export function isFullDayExceptionType(type: ScheduleExceptionType): boolean {
  return FULL_DAY_TYPES.includes(type);
}

export function isRangeExceptionType(type: ScheduleExceptionType): boolean {
  return RANGE_TYPES.includes(type);
}

@Schema({ timestamps: true })
export class ScheduleException {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  // Stored as a UTC midnight timestamp for that calendar date — always compared by Y/M/D.
  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ required: true, enum: ScheduleExceptionType })
  type: ScheduleExceptionType;

  // Required for CUSTOM_HOURS / EXTRA_HOURS / PARTIAL_DAY_LEAVE / BLOCKED_TIME; ignored for full-day types.
  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop()
  reason?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ScheduleExceptionSchema = SchemaFactory.createForClass(ScheduleException);
ScheduleExceptionSchema.index({ doctorId: 1, branchId: 1, date: 1 });
