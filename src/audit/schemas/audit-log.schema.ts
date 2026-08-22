import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  method: string;

  @Prop({ required: true })
  path: string;

  // First path segment after /api/ — e.g. "patients", "appointments".
  @Prop({ required: true, index: true })
  resource: string;

  @Prop()
  resourceId?: string;

  // A short human-readable label, e.g. "Created patient", "Cancelled appointment".
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  statusCode: number;

  @Prop()
  ipAddress?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ clinicId: 1, createdAt: -1 });
