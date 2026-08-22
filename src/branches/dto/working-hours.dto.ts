import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, Matches } from 'class-validator';

export class WorkingHoursDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  openTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
