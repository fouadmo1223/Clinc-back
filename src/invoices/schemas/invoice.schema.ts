import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
class InvoiceItem {
  @Prop({ required: true, trim: true }) description: string;
  @Prop({ required: true, min: 1, default: 1 }) quantity: number;
  @Prop({ required: true, min: 0 }) unitPrice: number;
  @Prop({ required: true, min: 0 }) total: number;
}
const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Visit', index: true })
  visitId?: Types.ObjectId;

  @Prop({ type: [InvoiceItemSchema], required: true, default: [] })
  items: InvoiceItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0, default: 0 })
  discount: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.UNPAID, index: true })
  status: InvoiceStatus;

  @Prop()
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ patientId: 1, createdAt: -1 });
InvoiceSchema.index({ clinicId: 1, status: 1 });
