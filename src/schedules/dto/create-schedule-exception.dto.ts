import { IsDateString, IsEnum, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { ScheduleExceptionType, isRangeExceptionType } from '../schemas/schedule-exception.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleExceptionDto {
  @IsString()
  doctorId: string;

  @IsString()
  branchId: string;

  @IsDateString()
  date: string;

  @IsEnum(ScheduleExceptionType)
  type: ScheduleExceptionType;

  @ValidateIf((o) => isRangeExceptionType(o.type))
  @IsString()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @ValidateIf((o) => isRangeExceptionType(o.type))
  @IsString()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
