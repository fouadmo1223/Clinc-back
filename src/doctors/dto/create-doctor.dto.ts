import { ArrayNotEmpty, IsArray, IsEmail, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  fullName: string;

  @IsString()
  specialty: string;

  @IsString()
  specialtyAr: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsNumber()
  @Min(0)
  consultationPrice: number;

  @IsNumber()
  @Min(0)
  followUpPrice: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  defaultAppointmentDurationMinutes?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  branchIds: string[];
}
