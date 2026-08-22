import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class QueryExpensesDto {
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
