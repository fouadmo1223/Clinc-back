import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDoctorDto } from './create-doctor.dto';

export class UpdateDoctorDto extends PartialType(OmitType(CreateDoctorDto, ['email'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
