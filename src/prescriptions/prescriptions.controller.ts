import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get(':id/pdf')
  @RequirePermissions(Permission.PRESCRIPTIONS_READ)
  async downloadPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const pdf = await this.prescriptionsService.generatePdf(clinicId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="prescription-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }

  @Get(':id/csv')
  @RequirePermissions(Permission.PRESCRIPTIONS_READ)
  async downloadCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const csv = await this.prescriptionsService.generateCsv(clinicId, id);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="prescription-${id}.csv"`,
    });
    return new StreamableFile(csv);
  }

  @Get(':id/xlsx')
  @RequirePermissions(Permission.PRESCRIPTIONS_READ)
  async downloadXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const xlsx = await this.prescriptionsService.generateXlsx(clinicId, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="prescription-${id}.xlsx"`,
    });
    return new StreamableFile(xlsx);
  }
}
