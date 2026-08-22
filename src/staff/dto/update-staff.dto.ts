import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(OmitType(CreateStaffDto, ['email'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
