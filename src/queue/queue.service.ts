import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { QueueEntry, QueueEntryDocument, QueueStatus } from './schemas/queue-entry.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class QueueService {
  constructor(
    @InjectModel(QueueEntry.name) private queueModel: Model<QueueEntryDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
  ) {}

  async checkIn(clinicId: string, user: AuthenticatedUser, dto: CheckInDto) {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');
    if (dto.doctorId) await this.doctorsService.findOne(clinicId, dto.doctorId);

    const date = startOfUtcDay();
    const last = await this.queueModel.findOne({ clinicId, branchId: dto.branchId, date }).sort({ queueNumber: -1 });
    const queueNumber = (last?.queueNumber ?? 0) + 1;

    const entry = await this.queueModel.create({
      clinicId: new Types.ObjectId(clinicId),
      branchId: new Types.ObjectId(dto.branchId),
      doctorId: dto.doctorId ? new Types.ObjectId(dto.doctorId) : undefined,
      patientId: new Types.ObjectId(dto.patientId),
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      date,
      queueNumber,
      status: QueueStatus.WAITING,
      checkedInAt: new Date(),
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    return this.enrich([entry]).then((r) => r[0]);
  }

  async findAll(clinicId: string, query: QueryQueueDto) {
    const filter: FilterQuery<QueueEntryDocument> = { clinicId, date: startOfUtcDay(query.date ? new Date(query.date) : new Date()) };
    if (query.branchId) filter.branchId = query.branchId;

    const entries = await this.queueModel.find(filter).sort({ queueNumber: 1 });
    return this.enrich(entries);
  }

  async updateStatus(clinicId: string, id: string, dto: UpdateQueueEntryDto) {
    const entry = await this.queueModel.findById(id);
    if (!entry) throw new NotFoundException('Queue entry not found');
    if (entry.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');

    entry.status = dto.status;
    if (dto.status === QueueStatus.IN_PROGRESS && !entry.calledAt) entry.calledAt = new Date();
    if (dto.status === QueueStatus.DONE && !entry.completedAt) entry.completedAt = new Date();
    await entry.save();

    return this.enrich([entry]).then((r) => r[0]);
  }

  private async enrich(entries: QueueEntryDocument[]) {
    if (entries.length === 0) return [];
    const clinicId = entries[0].clinicId.toString();
    const patientIds = [...new Set(entries.map((e) => e.patientId.toString()))];
    const doctorIds = [...new Set(entries.filter((e) => e.doctorId).map((e) => e.doctorId!.toString()))];

    const [patients, doctors] = await Promise.all([
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, phone: 1 }),
      Promise.all(doctorIds.map((id) => this.doctorsService.findOne(clinicId, id).catch(() => null))),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.filter((d): d is NonNullable<typeof d> => !!d).map((d) => [d.id, d]));

    return entries.map((e) => {
      const obj = e.toObject();
      const patient = patientMap.get(e.patientId.toString());
      const doctor = e.doctorId ? doctorMap.get(e.doctorId.toString()) : undefined;
      return { ...obj, patientName: patient?.fullName, patientPhone: patient?.phone, doctorName: doctor?.fullName };
    });
  }
}
