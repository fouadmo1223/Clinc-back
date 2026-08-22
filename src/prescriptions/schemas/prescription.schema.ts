import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

@Schema({ _id: false })
class Medication {
  @Prop({ required: true, trim: true }) name: string;
  @Prop() dosage?: string;
  @Prop() frequency?: string;
  @Prop({ min: 1 }) durationDays?: number;
  @Prop() instructions?: string;
}
const MedicationSchema = SchemaFactory.createForClass(Medication);

@Schema({ timestamps: true })
export class Prescription {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Visit', required: true, index: true })
  visitId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: [MedicationSchema], required: true, default: [] })
  medications: Medication[];

  @Prop()
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ visitId: 1 });
