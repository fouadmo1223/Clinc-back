import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class QueryQueueDto {
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
