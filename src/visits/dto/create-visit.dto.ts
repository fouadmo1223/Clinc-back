import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { VitalsDto } from './vitals.dto';

export class CreateVisitDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  doctorId: string;

  @IsMongoId()
  branchId: string;

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  examinationNotes?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}
