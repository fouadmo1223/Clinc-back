import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Prescription, PrescriptionDocument } from './schemas/prescription.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionsDto } from './dto/query-prescriptions.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { PdfService } from '../pdf/pdf.service';
import { buildPrescriptionHtml } from '../pdf/templates';
import { ExportService, ExportColumn } from '../pdf/export.service';
import { ClinicsService } from '../clinics/clinics.service';

const PRESCRIPTION_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'الدواء' },
  { key: 'dosage', label: 'الجرعة' },
  { key: 'frequency', label: 'التكرار' },
  { key: 'durationDays', label: 'المدة (أيام)' },
  { key: 'instructions', label: 'التعليمات' },
];

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectModel(Prescription.name) private prescriptionModel: Model<PrescriptionDocument>,
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
    private pdfService: PdfService,
    private exportService: ExportService,
    private clinicsService: ClinicsService,
  ) {}

  async create(clinicId: string, user: AuthenticatedUser, dto: CreatePrescriptionDto) {
    const visit = await this.visitModel.findById(dto.visitId);
    if (!visit || visit.clinicId.toString() !== clinicId) throw new NotFoundException('Visit not found');

    const prescription = await this.prescriptionModel.create({
      clinicId: new Types.ObjectId(clinicId),
      visitId: visit._id,
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      medications: dto.medications,
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    return this.enrich([prescription]).then((r) => r[0]);
  }

  async findAll(clinicId: string, query: QueryPrescriptionsDto) {
    const filter: FilterQuery<PrescriptionDocument> = { clinicId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.visitId) filter.visitId = query.visitId;

    const items = await this.prescriptionModel.find(filter).sort({ createdAt: -1 });
    return this.enrich(items);
  }

  async findOne(clinicId: string, id: string) {
    const prescription = await this.prescriptionModel.findById(id);
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (prescription.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return this.enrich([prescription]).then((r) => r[0]);
  }

  async generatePdf(clinicId: string, id: string): Promise<Buffer> {
    const prescription = await this.findOne(clinicId, id);
    const clinic = await this.clinicsService.findById(clinicId);

    const html = buildPrescriptionHtml(
      {
        name: clinic.name,
        nameAr: clinic.nameAr,
        address: clinic.address,
        city: clinic.city,
        contactPhone: clinic.contactPhone,
        contactEmail: clinic.contactEmail,
      },
      {
        date: new Date(prescription.createdAt).toLocaleDateString('en-GB'),
        patientName: prescription.patientName,
        doctorName: prescription.doctorName,
        medications: prescription.medications,
        notes: prescription.notes,
      },
    );

    return this.pdfService.renderHtmlToPdf(html);
  }

  async generateCsv(clinicId: string, id: string): Promise<Buffer> {
    const prescription = await this.findOne(clinicId, id);
    return this.exportService.buildCsv(PRESCRIPTION_EXPORT_COLUMNS, prescription.medications);
  }

  async generateXlsx(clinicId: string, id: string): Promise<Buffer> {
    const prescription = await this.findOne(clinicId, id);
    return this.exportService.buildXlsx('Prescription', PRESCRIPTION_EXPORT_COLUMNS, prescription.medications);
  }

  private async enrich(prescriptions: PrescriptionDocument[]) {
    if (prescriptions.length === 0) return [];
    const clinicId = prescriptions[0].clinicId.toString();
    const patientIds = [...new Set(prescriptions.map((p) => p.patientId.toString()))];
    const doctorIds = [...new Set(prescriptions.map((p) => p.doctorId.toString()))];

    const [patients, doctors] = await Promise.all([
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1 }),
      this.doctorsService.findByIds(clinicId, doctorIds),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.filter((d): d is NonNullable<typeof d> => !!d).map((d) => [d.id, d]));

    return prescriptions.map((p) => {
      const obj = p.toObject();
      return {
        ...obj,
        patientName: patientMap.get(p.patientId.toString())?.fullName,
        doctorName: doctorMap.get(p.doctorId.toString())?.fullName,
      };
    });
  }
}
