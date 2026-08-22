import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, SchemaTypes, Types } from 'mongoose';

export type ClinicDocumentDocument = ClinicDocument & MongooseDocument;

export enum DocumentCategory {
  LAB_RESULT = 'LAB_RESULT',
  SCAN = 'SCAN',
  REPORT = 'REPORT',
  PRESCRIPTION = 'PRESCRIPTION',
  OTHER = 'OTHER',
}

// Named ClinicDocument (not Document) to avoid clashing with Mongoose's own Document type.
@Schema({ timestamps: true })
export class ClinicDocument {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Clinic', required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Visit', index: true })
  visitId?: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  fileSizeBytes: number;

  @Prop({ required: true, enum: DocumentCategory, default: DocumentCategory.OTHER })
  category: DocumentCategory;

  @Prop()
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  uploadedBy?: Types.ObjectId;
}

export const ClinicDocumentSchema = SchemaFactory.createForClass(ClinicDocument);
ClinicDocumentSchema.index({ patientId: 1, createdAt: -1 });
