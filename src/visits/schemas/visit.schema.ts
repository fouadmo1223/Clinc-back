import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type VisitDocument = Visit & Document;

export enum VisitStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Schema({ _id: false })
class Vitals {
  @Prop({ min: 0 }) bloodPressureSystolic?: number;
  @Prop({ min: 0 }) bloodPressureDiastolic?: number;
  @Prop({ min: 0 }) heartRate?: number;
  @Prop({ min: 0 }) temperatureCelsius?: number;
  @Prop({ min: 0 }) weightKg?: number;
  @Prop({ min: 0 }) heightCm?: number;
}
const VitalsSchema = SchemaFactory.createForClass(Vitals);

@Schema({ timestamps: true })
export class Visit {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Appointment', index: true })
  appointmentId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  date: Date;

  @Prop()
  chiefComplaint?: string;

  @Prop({ type: VitalsSchema })
  vitals?: Vitals;

  @Prop()
  diagnosis?: string;

  @Prop()
  examinationNotes?: string;

  @Prop()
  treatmentPlan?: string;

  @Prop({ required: true, enum: VisitStatus, default: VisitStatus.COMPLETED })
  status: VisitStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ patientId: 1, date: -1 });
VisitSchema.index({ clinicId: 1, date: -1 });
