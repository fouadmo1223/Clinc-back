import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type QueueEntryDocument = QueueEntry & Document;

export enum QueueStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class QueueEntry {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', index: true })
  doctorId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Appointment' })
  appointmentId?: Types.ObjectId;

  // UTC-midnight for the calendar day this queue entry belongs to — queue numbers reset daily per branch.
  @Prop({ required: true, index: true })
  date: Date;

  // Only assigned to walk-ins (no appointmentId) — its own 1, 2, 3... sequence,
  // separate from booked patients, who are shown by their appointment time instead.
  @Prop({ min: 1 })
  queueNumber?: number;

  @Prop({ required: true, enum: QueueStatus, default: QueueStatus.WAITING, index: true })
  status: QueueStatus;

  @Prop({ required: true, default: Date.now })
  checkedInAt: Date;

  @Prop()
  calledAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const QueueEntrySchema = SchemaFactory.createForClass(QueueEntry);
QueueEntrySchema.index({ clinicId: 1, branchId: 1, date: 1, queueNumber: 1 });
