import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
import { DocumentCategory } from '../schemas/document.schema';

export class UploadDocumentDto {
  @IsMongoId()
  patientId: string;

  @IsOptional()
  @IsMongoId()
  visitId?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  notes?: string;
}
