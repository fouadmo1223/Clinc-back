import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type DoctorDocument = Doctor & Document;

@Schema({ timestamps: true })
export class Doctor {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop()
  photoUrl?: string;

  @Prop({ required: true })
  specialty: string;

  @Prop({ required: true })
  specialtyAr: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop()
  bio?: string;

  @Prop({ required: true, min: 0 })
  consultationPrice: number;

  @Prop({ required: true, min: 0 })
  followUpPrice: number;

  @Prop({ default: 20, min: 5 })
  defaultAppointmentDurationMinutes: number;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Branch', default: [] })
  branchIds: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
DoctorSchema.index({ clinicId: 1, isActive: 1 });
