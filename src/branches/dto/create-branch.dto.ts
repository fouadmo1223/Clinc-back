import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WorkingHoursDto } from './working-hours.dto';

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto[];
}
