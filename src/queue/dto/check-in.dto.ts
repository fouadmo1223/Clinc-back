import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  branchId: string;

  @IsOptional()
  @IsMongoId()
  doctorId?: string;

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
