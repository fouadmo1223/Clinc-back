import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]), InvoicesModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, MongooseModule],
})
export class PaymentsModule {}
