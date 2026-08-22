import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClinicDocument = Clinic & Document;

@Schema({ _id: false })
class WorkingHours {
  @Prop({ required: true }) day: number; // 0=Sunday .. 6=Saturday
  @Prop({ required: true }) openTime: string; // "09:00"
  @Prop({ required: true }) closeTime: string; // "22:00"
  @Prop({ default: false }) isClosed: boolean;
}
const WorkingHoursSchema = SchemaFactory.createForClass(WorkingHours);

@Schema({ _id: false })
class AppointmentSettings {
  @Prop({ default: 15 }) defaultDurationMinutes: number;
  @Prop({ default: 30 }) bookingLeadTimeMinutes: number;
  @Prop({ default: 60 }) maxAdvanceBookingDays: number;
  @Prop({ default: true }) allowOnlineBooking: boolean;
  @Prop({ default: true }) allowWalkIns: boolean;
  @Prop({ default: false }) requireConfirmation: boolean;
}
const AppointmentSettingsSchema = SchemaFactory.createForClass(AppointmentSettings);

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  nameAr: string;

  @Prop({ unique: true, index: true, trim: true, lowercase: true })
  slug: string;

  @Prop()
  logoUrl?: string;

  @Prop({ required: true })
  contactEmail: string;

  @Prop({ type: [String], required: true })
  contactPhones: string[];

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop({ type: [WorkingHoursSchema], default: [] })
  workingHours: WorkingHours[];

  @Prop({ type: AppointmentSettingsSchema, default: () => ({}) })
  appointmentSettings: AppointmentSettings;

  @Prop({ type: [String], default: [] })
  services: string[];

  @Prop({ default: 'active', enum: ['trial', 'active', 'suspended', 'cancelled'] })
  subscriptionStatus: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
