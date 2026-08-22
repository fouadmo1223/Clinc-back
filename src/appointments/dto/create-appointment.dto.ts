import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Matches, Min } from 'class-validator';
import { VisitType } from '../schemas/appointment.schema';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateAppointmentDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  doctorId: string;

  @IsMongoId()
  branchId: string;

  @IsDateString()
  date: string;

  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(VisitType)
  visitType?: VisitType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
