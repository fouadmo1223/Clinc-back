import { IsMongoId, IsOptional } from 'class-validator';

export class QueryPrescriptionsDto {
  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  visitId?: string;
}
