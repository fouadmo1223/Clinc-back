import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { InvoiceStatus } from '../schemas/invoice.schema';

export class QueryInvoicesDto {
  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
