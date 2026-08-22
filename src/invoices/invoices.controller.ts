import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @RequirePermissions(Permission.INVOICES_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.INVOICES_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryInvoicesDto) {
    return this.invoicesService.findAll(requireClinicId(user), query);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVOICES_READ)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invoicesService.findOne(requireClinicId(user), id);
  }

  @Get(':id/pdf')
  @RequirePermissions(Permission.INVOICES_READ)
  async downloadPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const pdf = await this.invoicesService.generatePdf(clinicId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
    });
    return new StreamableFile(pdf);
  }

  @Get(':id/csv')
  @RequirePermissions(Permission.INVOICES_READ)
  async downloadCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const csv = await this.invoicesService.generateCsv(clinicId, id);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoice-${id}.csv"`,
    });
    return new StreamableFile(csv);
  }

  @Get(':id/xlsx')
  @RequirePermissions(Permission.INVOICES_READ)
  async downloadXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clinicId = requireClinicId(user);
    const xlsx = await this.invoicesService.generateXlsx(clinicId, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="invoice-${id}.xlsx"`,
    });
    return new StreamableFile(xlsx);
  }
}
