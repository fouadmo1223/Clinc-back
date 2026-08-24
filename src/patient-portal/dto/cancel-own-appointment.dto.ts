import { IsOptional, IsString } from 'class-validator';

export class CancelOwnAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
