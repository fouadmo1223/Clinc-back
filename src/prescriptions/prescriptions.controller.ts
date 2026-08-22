import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionsDto } from './dto/query-prescriptions.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Post()
  @RequirePermissions(Permission.PRESCRIPTIONS_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.PRESCRIPTIONS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryPrescriptionsDto) {
    return this.prescriptionsService.findAll(requireClinicId(user), query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRESCRIPTIONS_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.prescriptionsService.findOne(requireClinicId(user), id);
  }
}
