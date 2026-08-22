import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
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
