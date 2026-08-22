import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { QueueEntry, QueueEntryDocument, QueueStatus } from './schemas/queue-entry.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { Appointment, AppointmentDocument, AppointmentStatus } from '../appointments/schemas/appointment.schema';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateQueueEntryDto } from './dto/update-queue-entry.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class QueueService {
  constructor(
    @InjectModel(QueueEntry.name) private queueModel: Model<QueueEntryDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    private doctorsService: DoctorsService,
    private appointmentsService: AppointmentsService,
  ) {}

  async checkIn(clinicId: string, user: AuthenticatedUser, dto: CheckInDto) {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');
    if (dto.doctorId) await this.doctorsService.findOne(clinicId, dto.doctorId);

    let appointment: AppointmentDocument | null = null;
    if (dto.appointmentId) {
      appointment = await this.appointmentModel.findById(dto.appointmentId);
      if (!appointment || appointment.clinicId.toString() !== clinicId) throw new NotFoundException('Appointment not found');
      if (appointment.patientId.toString() !== dto.patientId) {
        throw new BadRequestException('That appointment does not belong to this patient');
      }
    }

    const date = startOfUtcDay();

    let queueNumber: number | undefined;
    if (!appointment) {
      // Walk-ins get their own 1, 2, 3... sequence, separate from booked patients.
      const last = await this.queueModel
        .findOne({ clinicId, branchId: dto.branchId, date, queueNumber: { $exists: true, $ne: null } })
        .sort({ queueNumber: -1 });
      queueNumber = (last?.queueNumber ?? 0) + 1;
    }

    const entry = await this.queueModel.create({
      clinicId: new Types.ObjectId(clinicId),
      branchId: new Types.ObjectId(dto.branchId),
      doctorId: dto.doctorId ? new Types.ObjectId(dto.doctorId) : appointment?.doctorId,
      patientId: new Types.ObjectId(dto.patientId),
      appointmentId: appointment?._id,
      date,
      queueNumber,
      status: QueueStatus.WAITING,
      checkedInAt: new Date(),
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    // Checking in means the patient physically showed up — reflect that on the
    // linked appointment so it doesn't just sit at SCHEDULED all day.
    if (appointment && appointment.status === AppointmentStatus.SCHEDULED) {
      await this.appointmentsService
        .update(clinicId, appointment.id, { status: AppointmentStatus.CONFIRMED })
        .catch(() => undefined);
    }

    return this.enrich([entry]).then((r) => r[0]);
  }

  async findAll(clinicId: string, query: QueryQueueDto) {
    const filter: FilterQuery<QueueEntryDocument> = { clinicId, date: startOfUtcDay(query.date ? new Date(query.date) : new Date()) };
    if (query.branchId) filter.branchId = query.branchId;

    const entries = await this.queueModel.find(filter);
    const enriched = await this.enrich(entries);

    // Booked patients (shown by appointment time) take priority over walk-ins
    // (shown by check-in order), matching how the front desk actually calls people in.
    return enriched.sort((a, b) => {
      const aBooked = !!a.appointmentStartTime;
      const bBooked = !!b.appointmentStartTime;
      if (aBooked !== bBooked) return aBooked ? -1 : 1;
      if (aBooked && bBooked) return a.appointmentStartTime!.localeCompare(b.appointmentStartTime!);
      return (a.queueNumber ?? 0) - (b.queueNumber ?? 0);
    });
  }

  async updateStatus(clinicId: string, id: string, dto: UpdateQueueEntryDto) {
    const entry = await this.queueModel.findById(id);
    if (!entry) throw new NotFoundException('Queue entry not found');
    if (entry.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');

    entry.status = dto.status;
    if (dto.status === QueueStatus.IN_PROGRESS && !entry.calledAt) entry.calledAt = new Date();
    if (dto.status === QueueStatus.DONE && !entry.completedAt) entry.completedAt = new Date();
    await entry.save();

    // Finishing the queue entry means the visit is done — reflect that on the
    // linked appointment (reuses the same update path visits use for this).
    if (dto.status === QueueStatus.DONE && entry.appointmentId) {
      await this.appointmentsService
        .update(clinicId, entry.appointmentId.toString(), { status: AppointmentStatus.COMPLETED })
        .catch(() => undefined);
    }

    return this.enrich([entry]).then((r) => r[0]);
  }

  private async enrich(entries: QueueEntryDocument[]) {
    if (entries.length === 0) return [];
    const clinicId = entries[0].clinicId.toString();
    const patientIds = [...new Set(entries.map((e) => e.patientId.toString()))];
    const doctorIds = [...new Set(entries.filter((e) => e.doctorId).map((e) => e.doctorId!.toString()))];
    const appointmentIds = [...new Set(entries.filter((e) => e.appointmentId).map((e) => e.appointmentId!.toString()))];

    const [patients, doctors, appointments] = await Promise.all([
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, phone: 1 }),
      Promise.all(doctorIds.map((id) => this.doctorsService.findOne(clinicId, id).catch(() => null))),
      this.appointmentModel.find({ _id: { $in: appointmentIds } }, { startTime: 1 }),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.filter((d): d is NonNullable<typeof d> => !!d).map((d) => [d.id, d]));
    const appointmentMap = new Map(appointments.map((a) => [a.id, a]));

    return entries.map((e) => {
      const obj = e.toObject();
      const patient = patientMap.get(e.patientId.toString());
      const doctor = e.doctorId ? doctorMap.get(e.doctorId.toString()) : undefined;
      const appointment = e.appointmentId ? appointmentMap.get(e.appointmentId.toString()) : undefined;
      return {
        ...obj,
        patientName: patient?.fullName,
        patientPhone: patient?.phone,
        doctorName: doctor?.fullName,
        appointmentStartTime: appointment?.startTime,
      };
    });
  }
}
