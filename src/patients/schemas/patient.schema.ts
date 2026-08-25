import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ enum: ['MALE', 'FEMALE'] })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  address?: string;

  @Prop()
  nationalId?: string;

  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactPhone?: string;

  @Prop()
  notes?: string;

  // Medical fields — only exposed to users with patients.medical.read (see PatientsService).
  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop({ type: [String], default: [] })
  currentMedications: string[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  // Patient-portal OTP login — never returned by default queries.
  // TODO: stored in plaintext for now (debugging); hash with argon2 before real patients use this.
  @Prop({ select: false })
  otpCode?: string;

  @Prop({ select: false })
  otpExpiresAt?: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
PatientSchema.index({ clinicId: 1, phone: 1 });
PatientSchema.index({ clinicId: 1, fullName: 1 });
