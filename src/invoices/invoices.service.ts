import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from './schemas/invoice.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { PdfService } from '../pdf/pdf.service';
import { buildInvoiceHtml } from '../pdf/templates';
import { ExportService, ExportColumn } from '../pdf/export.service';
import { ClinicsService } from '../clinics/clinics.service';

const INVOICE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'description', label: 'الوصف' },
  { key: 'quantity', label: 'الكمية' },
  { key: 'unitPrice', label: 'سعر الوحدة' },
  { key: 'total', label: 'الإجمالي' },
];

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private pdfService: PdfService,
    private exportService: ExportService,
    private clinicsService: ClinicsService,
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

  async generatePdf(clinicId: string, id: string): Promise<Buffer> {
    const invoice = await this.findOne(clinicId, id);
    const clinic = await this.clinicsService.findById(clinicId);

    const html = buildInvoiceHtml(
      {
        name: clinic.name,
        nameAr: clinic.nameAr,
        address: clinic.address,
        city: clinic.city,
        contactPhones: clinic.contactPhones,
        contactEmail: clinic.contactEmail,
      },
      {
        invoiceNumber: invoice._id.toString().slice(-8).toUpperCase(),
        date: new Date(invoice.createdAt).toLocaleDateString('en-GB'),
        patientName: invoice.patientName,
        patientPhone: invoice.patientPhone,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        status: invoice.status,
        notes: invoice.notes,
      },
    );

    return this.pdfService.renderHtmlToPdf(html);
  }

  /** Line items plus a totals summary, shared by the CSV and Excel exports. */
  private buildExportRows(invoice: {
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
  }): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));
    rows.push({ description: 'الإجمالي الفرعي', quantity: '', unitPrice: '', total: invoice.subtotal });
    if (invoice.discount > 0) rows.push({ description: 'الخصم', quantity: '', unitPrice: '', total: -invoice.discount });
    rows.push({ description: 'الإجمالي', quantity: '', unitPrice: '', total: invoice.total });
    rows.push({ description: 'المبلغ المدفوع', quantity: '', unitPrice: '', total: invoice.amountPaid });
    rows.push({ description: 'المبلغ المستحق', quantity: '', unitPrice: '', total: invoice.total - invoice.amountPaid });
    return rows;
  }

  async generateCsv(clinicId: string, id: string): Promise<Buffer> {
    const invoice = await this.findOne(clinicId, id);
    return this.exportService.buildCsv(INVOICE_EXPORT_COLUMNS, this.buildExportRows(invoice));
  }

  async generateXlsx(clinicId: string, id: string): Promise<Buffer> {
    const invoice = await this.findOne(clinicId, id);
    return this.exportService.buildXlsx('Invoice', INVOICE_EXPORT_COLUMNS, this.buildExportRows(invoice));
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
