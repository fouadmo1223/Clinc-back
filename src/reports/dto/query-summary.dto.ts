import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class QuerySummaryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;
}
