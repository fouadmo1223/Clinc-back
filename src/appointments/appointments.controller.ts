import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions(Permission.APPOINTMENTS_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.APPOINTMENTS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.findAll(requireClinicId(user), query);
  }

  @Get(':id')
  @RequirePermissions(Permission.APPOINTMENTS_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentsService.findOne(requireClinicId(user), id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.APPOINTMENTS_UPDATE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(requireClinicId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.APPOINTMENTS_CANCEL)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelAppointmentDto) {
    return this.appointmentsService.cancel(requireClinicId(user), user, id, dto);
  }
}
