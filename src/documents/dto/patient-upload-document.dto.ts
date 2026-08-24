import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentCategory } from '../schemas/document.schema';

/** No patientId field — a patient can only ever upload to their own record, taken from the JWT. */
export class PatientUploadDocumentDto {
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  notes?: string;
}
