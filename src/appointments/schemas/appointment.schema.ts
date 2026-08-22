import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum VisitType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  // Stored as a UTC midnight timestamp for that calendar date — always compared by Y/M/D.
  @Prop({ required: true, index: true })
  date: Date;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true, min: 5 })
  durationMinutes: number;

  @Prop({ required: true, enum: VisitType, default: VisitType.CONSULTATION })
  visitType: VisitType;

  @Prop({ required: true, enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED, index: true })
  status: AppointmentStatus;

  @Prop({ min: 0 })
  price?: number;

  @Prop()
  reason?: string;

  @Prop()
  notes?: string;

  @Prop()
  cancelReason?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
AppointmentSchema.index({ doctorId: 1, branchId: 1, date: 1 });
AppointmentSchema.index({ clinicId: 1, date: 1 });
AppointmentSchema.index({ patientId: 1, date: -1 });
