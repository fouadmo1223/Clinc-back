import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { SetWeeklyScheduleDto } from './dto/set-weekly-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller()
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Put('doctors/:doctorId/schedule')
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  setWeeklySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('doctorId') doctorId: string,
    @Query('branchId') branchId: string,
    @Body() dto: SetWeeklyScheduleDto,
  ) {
    return this.schedulesService.setWeeklySchedule(requireClinicId(user), doctorId, branchId, dto);
  }

  @Get('doctors/:doctorId/schedule')
  @RequirePermissions(Permission.DOCTORS_READ)
  getWeeklySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('doctorId') doctorId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.schedulesService.getWeeklySchedule(requireClinicId(user), doctorId, branchId);
  }

  @Post('schedule-exceptions')
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  createException(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduleExceptionDto) {
    return this.schedulesService.createException(requireClinicId(user), user.userId, dto);
  }

  @Get('schedule-exceptions')
  @RequirePermissions(Permission.DOCTORS_READ)
  listExceptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('doctorId') doctorId: string,
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedulesService.listExceptions(requireClinicId(user), doctorId, branchId, from, to);
  }

  @Delete('schedule-exceptions/:id')
  @RequirePermissions(Permission.DOCTORS_MANAGE)
  deleteException(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.schedulesService.deleteException(requireClinicId(user), id);
  }
}
