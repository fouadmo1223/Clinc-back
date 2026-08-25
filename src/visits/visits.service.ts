import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Visit, VisitDocument, VisitStatus } from './schemas/visit.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/schemas/appointment.schema';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { scopeToBranch, assertBranchAccess, BranchScoped } from '../common/utils/branch-scope';

function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
    private appointmentsService: AppointmentsService,
  ) {}

  private async findRaw(clinicId: string, id: string): Promise<VisitDocument> {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return visit;
  }

  async create(clinicId: string, user: AuthenticatedUser, dto: CreateVisitDto) {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');
    await this.doctorsService.findOne(clinicId, dto.doctorId);

    const visit = await this.visitModel.create({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(dto.doctorId),
      branchId: new Types.ObjectId(dto.branchId),
      patientId: new Types.ObjectId(dto.patientId),
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      date: dto.date ? startOfUtcDay(new Date(dto.date)) : startOfUtcDay(),
      chiefComplaint: dto.chiefComplaint,
      vitals: dto.vitals,
      diagnosis: dto.diagnosis,
      examinationNotes: dto.examinationNotes,
      treatmentPlan: dto.treatmentPlan,
      status: VisitStatus.COMPLETED,
      createdBy: new Types.ObjectId(user.userId),
    });

    // Recording a visit for a linked appointment marks that appointment done —
    // reuses the appointment update path rather than writing to the model directly.
    if (dto.appointmentId) {
      await this.appointmentsService.update(clinicId, dto.appointmentId, { status: AppointmentStatus.COMPLETED }).catch(() => undefined);
    }

    return this.enrich([visit]).then((r) => r[0]);
  }

  async findAll(clinicId: string, user: BranchScoped, query: QueryVisitsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<VisitDocument> = { clinicId };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.doctorId) filter.doctorId = query.doctorId;
    const branchScope = scopeToBranch(user, query.branchId);
    if (branchScope !== undefined) filter.branchId = branchScope;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = startOfUtcDay(new Date(query.from));
      if (query.to) range.$lte = startOfUtcDay(new Date(query.to));
      filter.date = range;
    }

    const [items, total] = await Promise.all([
      this.visitModel
        .find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.visitModel.countDocuments(filter),
    ]);

    return {
      items: await this.enrich(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(clinicId: string, user: BranchScoped, id: string) {
    const visit = await this.findRaw(clinicId, id);
    assertBranchAccess(user, visit.branchId.toString());
    return this.enrich([visit]).then((r) => r[0]);
  }

  async update(clinicId: string, id: string, dto: UpdateVisitDto) {
    const visit = await this.findRaw(clinicId, id);
    Object.assign(visit, dto);
    await visit.save();
    return this.enrich([visit]).then((r) => r[0]);
  }

  private async enrich(visits: VisitDocument[]) {
    if (visits.length === 0) return [];
    const clinicId = visits[0].clinicId.toString();
    const patientIds = [...new Set(visits.map((v) => v.patientId.toString()))];
    const doctorIds = [...new Set(visits.map((v) => v.doctorId.toString()))];

    const [patients, doctors] = await Promise.all([
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, phone: 1 }),
      this.doctorsService.findByIds(clinicId, doctorIds),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.filter((d): d is NonNullable<typeof d> => !!d).map((d) => [d.id, d]));

    return visits.map((v) => {
      const obj = v.toObject();
      const patient = patientMap.get(v.patientId.toString());
      const doctor = doctorMap.get(v.doctorId.toString());
      return {
        ...obj,
        date: v.date.toISOString().slice(0, 10),
        patientName: patient?.fullName,
        patientPhone: patient?.phone,
        doctorName: doctor?.fullName,
      };
    });
  }
}
