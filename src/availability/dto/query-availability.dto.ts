import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAvailabilityDto {
  @IsString()
  doctorId: string;

  @IsString()
  branchId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes?: number;
}
