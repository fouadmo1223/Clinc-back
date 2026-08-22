import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentType } from './schemas/payment.schema';
import { InvoiceStatus } from '../invoices/schemas/invoice.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private invoicesService: InvoicesService,
  ) {}

  async create(clinicId: string, user: AuthenticatedUser, dto: CreatePaymentDto) {
    const invoice = await this.invoicesService.findRaw(clinicId, dto.invoiceId);
    if (invoice.status === InvoiceStatus.CANCELLED) throw new BadRequestException('Cannot pay a cancelled invoice');

    const payment = await this.paymentModel.create({
      clinicId: new Types.ObjectId(clinicId),
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      amount: dto.amount,
      type: PaymentType.PAYMENT,
      method: dto.method,
      reference: dto.reference,
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    await this.invoicesService.applyPaymentDelta(invoice, dto.amount);
    return payment;
  }

  async refund(clinicId: string, user: AuthenticatedUser, dto: CreateRefundDto) {
    const invoice = await this.invoicesService.findRaw(clinicId, dto.invoiceId);
    if (dto.amount > invoice.amountPaid) throw new BadRequestException('Refund amount exceeds the amount paid');

    const payment = await this.paymentModel.create({
      clinicId: new Types.ObjectId(clinicId),
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      amount: dto.amount,
      type: PaymentType.REFUND,
      method: dto.method,
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    await this.invoicesService.applyPaymentDelta(invoice, -dto.amount);
    return payment;
  }

  async findAll(clinicId: string, query: QueryPaymentsDto) {
    const filter: FilterQuery<PaymentDocument> = { clinicId };
    if (query.invoiceId) filter.invoiceId = query.invoiceId;
    if (query.patientId) filter.patientId = query.patientId;
    return this.paymentModel.find(filter).sort({ paidAt: -1 });
  }
}
