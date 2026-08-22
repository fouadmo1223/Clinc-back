import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post()
  @RequirePermissions(Permission.PATIENTS_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.PATIENTS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryPatientsDto) {
    return this.patientsService.findAll(requireClinicId(user), user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PATIENTS_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientsService.findOne(requireClinicId(user), user, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PATIENTS_UPDATE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(requireClinicId(user), user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PATIENTS_DELETE)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientsService.deactivate(requireClinicId(user), user, id);
  }
}
