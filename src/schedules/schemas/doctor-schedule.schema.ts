import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type DoctorScheduleDocument = DoctorSchedule & Document;

@Schema({ _id: false })
class Break {
  @Prop({ required: true }) startTime: string;
  @Prop({ required: true }) endTime: string;
}
const BreakSchema = SchemaFactory.createForClass(Break);

/** One weekly recurring working-hours entry for a doctor at a specific branch. */
@Schema({ timestamps: true })
export class DoctorSchedule {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday

  @Prop({ required: true })
  startTime: string; // "HH:mm"

  @Prop({ required: true })
  endTime: string;

  @Prop({ type: [BreakSchema], default: [] })
  breaks: Break[];

  @Prop({ default: false })
  isClosed: boolean;
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);
DoctorScheduleSchema.index({ doctorId: 1, branchId: 1, dayOfWeek: 1 }, { unique: true });
