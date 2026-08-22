import { IsMongoId, IsOptional } from 'class-validator';

export class QueryPaymentsDto {
  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @IsOptional()
  @IsMongoId()
  patientId?: string;
}
