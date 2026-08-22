import { PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateVisitDto } from './create-visit.dto';
import { VisitStatus } from '../schemas/visit.schema';

export class UpdateVisitDto extends PartialType(OmitType(CreateVisitDto, ['patientId', 'doctorId', 'branchId', 'appointmentId'] as const)) {
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;
}
