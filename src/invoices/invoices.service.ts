import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from './schemas/invoice.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
  ) {}

  async findRaw(clinicId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return invoice;
  }

  async create(clinicId: string, user: AuthenticatedUser, dto: CreateInvoiceDto) {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');

    const items = dto.items.map((item) => {
      const quantity = item.quantity ?? 1;
      return { description: item.description, quantity, unitPrice: item.unitPrice, total: quantity * item.unitPrice };
    });
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = Math.min(dto.discount ?? 0, subtotal);
    const total = subtotal - discount;

    const invoice = await this.invoiceModel.create({
      clinicId: new Types.ObjectId(clinicId),
      branchId: new Types.ObjectId(dto.branchId),
      patientId: new Types.ObjectId(dto.patientId),
      visitId: dto.visitId ? new Types.ObjectId(dto.visitId) : undefined,
      items,
      subtotal,
      discount,
      total,
      amountPaid: 0,
      status: InvoiceStatus.UNPAID,
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    return this.enrich([invoice]).then((r) => r[0]);
  }

  async findAll(clinicId: string, query: QueryInvoicesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<InvoiceDocument> = { clinicId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      items: await this.enrich(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(clinicId: string, id: string) {
    const invoice = await this.findRaw(clinicId, id);
    return this.enrich([invoice]).then((r) => r[0]);
  }

  /** Applies a signed payment/refund delta and recomputes status. Called by PaymentsService. */
  async applyPaymentDelta(invoice: InvoiceDocument, delta: number): Promise<InvoiceDocument> {
    invoice.amountPaid = Math.max(0, invoice.amountPaid + delta);
    if (invoice.amountPaid <= 0) invoice.status = InvoiceStatus.UNPAID;
    else if (invoice.amountPaid >= invoice.total) invoice.status = InvoiceStatus.PAID;
    else invoice.status = InvoiceStatus.PARTIALLY_PAID;
    await invoice.save();
    return invoice;
  }

  private async enrich(invoices: InvoiceDocument[]) {
    if (invoices.length === 0) return [];
    const patientIds = [...new Set(invoices.map((i) => i.patientId.toString()))];
    const patients = await this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, phone: 1 });
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    return invoices.map((i) => {
      const obj = i.toObject();
      const patient = patientMap.get(i.patientId.toString());
      return { ...obj, patientName: patient?.fullName, patientPhone: patient?.phone };
    });
  }
}
