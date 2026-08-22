import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class MedicationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @IsMongoId()
  visitId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications: MedicationDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
