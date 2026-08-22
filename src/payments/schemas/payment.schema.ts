import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  INSURANCE = 'INSURANCE',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, enum: PaymentType, default: PaymentType.PAYMENT })
  type: PaymentType;

  @Prop({ required: true, enum: PaymentMethod })
  method: PaymentMethod;

  @Prop()
  reference?: string;

  @Prop()
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  paidAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ invoiceId: 1, createdAt: -1 });
PaymentSchema.index({ clinicId: 1, paidAt: -1 });
