import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions(Permission.PAYMENTS_CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(requireClinicId(user), user, dto);
  }

  @Post('refund')
  @RequirePermissions(Permission.PAYMENTS_REFUND)
  refund(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRefundDto) {
    return this.paymentsService.refund(requireClinicId(user), user, dto);
  }

  @Get()
  @RequirePermissions(Permission.PAYMENTS_READ)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(requireClinicId(user), query);
  }
}
