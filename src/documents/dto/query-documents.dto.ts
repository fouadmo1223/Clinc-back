import { IsMongoId, IsOptional } from 'class-validator';

export class QueryDocumentsDto {
  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  visitId?: string;
}
