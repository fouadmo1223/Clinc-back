import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]), PatientsModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService, MongooseModule],
})
export class InvoicesModule {}
