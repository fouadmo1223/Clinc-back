import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ _id: false })
class WorkingHours {
  @Prop({ required: true }) day: number; // 0=Sunday .. 6=Saturday
  @Prop({ required: true }) openTime: string;
  @Prop({ required: true }) closeTime: string;
  @Prop({ default: false }) isClosed: boolean;
}
const WorkingHoursSchema = SchemaFactory.createForClass(WorkingHours);

@Schema({ timestamps: true })
export class Branch {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  nameAr: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  city?: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: [WorkingHoursSchema], default: [] })
  workingHours: WorkingHours[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lat?: number;

  @Prop()
  lng?: number;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
BranchSchema.index({ clinicId: 1, isActive: 1 });
