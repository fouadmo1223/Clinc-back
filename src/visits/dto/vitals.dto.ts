import { IsNumber, IsOptional, Min } from 'class-validator';

export class VitalsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  bloodPressureSystolic?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bloodPressureDiastolic?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heartRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;
}
