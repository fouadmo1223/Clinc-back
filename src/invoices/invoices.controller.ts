import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
}
