import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

class BreakDto {
  @IsString()
  @Matches(TIME_PATTERN)
  startTime: string;

  @IsString()
  @Matches(TIME_PATTERN)
  endTime: string;
}

class DayScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsString()
  @Matches(TIME_PATTERN)
  startTime: string;

  @IsString()
  @Matches(TIME_PATTERN)
  endTime: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakDto)
  breaks?: BreakDto[];
}

export class SetWeeklyScheduleDto {
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  days: DayScheduleDto[];
}
