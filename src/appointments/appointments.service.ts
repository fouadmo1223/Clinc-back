import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus, VisitType } from './schemas/appointment.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { SchedulesService } from '../schedules/schedules.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../common/sms/sms.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { parseTime, formatTime, rangesOverlap, TimeRange } from '../common/utils/time.util';

function startOfUtcDay(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
    private schedulesService: SchedulesService,
    private notificationsService: NotificationsService,
    private clinicsService: ClinicsService,
    private mailService: MailService,
    private smsService: SmsService,
  ) {}

  /** Notifies the doctor's own login (if they have one) — appointments created for a doctor without a user account are silently skipped. */
  private async notifyDoctor(
    clinicId: string,
    doctorId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    const doctor = await this.doctorsService.findOne(clinicId, doctorId).catch(() => null);
    await this.notificationsService.notifyDoctorIfLinked({ clinicId, doctor, type, title, message, link: '/appointments' });
  }

  /** Notifies the patient directly — SMS to their phone (always present) and email if they have one on file — separate from the in-app doctor notification above. */
  private async notifyPatient(
    clinicId: string,
    patient: { email?: string; phone?: string; fullName: string } | null | undefined,
    doctorName: string,
    kind: 'booked' | 'cancelled' | 'reminder',
    date: string,
    time: string,
    reason?: string,
  ): Promise<void> {
    if (!patient) return;
    const clinic = await this.clinicsService.findById(clinicId).catch(() => null);
    const params = { patientName: patient.fullName, doctorName, clinicName: clinic?.name ?? 'the clinic', date, time };

    const tasks: Promise<void>[] = [];
    if (patient.email) {
      tasks.push(
        kind === 'booked'
          ? this.mailService.sendPatientAppointmentBooked(patient.email, params)
          : kind === 'cancelled'
            ? this.mailService.sendPatientAppointmentCancelled(patient.email, { ...params, reason })
            : this.mailService.sendPatientAppointmentReminder(patient.email, params),
      );
    }
    if (patient.phone) {
      tasks.push(
        kind === 'booked'
          ? this.smsService.sendPatientAppointmentBooked(patient.phone, params)
          : kind === 'cancelled'
            ? this.smsService.sendPatientAppointmentCancelled(patient.phone, { ...params, reason })
            : this.smsService.sendPatientAppointmentReminder(patient.phone, params),
      );
    }
    await Promise.all(tasks.map((t) => t.catch(() => undefined)));
  }

  private async findRaw(clinicId: string, id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.clinicId.toString() !== clinicId) throw new ForbiddenException('Cross-clinic access denied');
    return appointment;
  }

  /** Confirms the requested range doesn't collide with the doctor's working hours, breaks, or other bookings. */
  private async assertSlotIsFree(
    clinicId: string,
    doctorId: string,
    branchId: string,
    dateStr: string,
    startTime: string,
    durationMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const requested: TimeRange = { start: parseTime(startTime), end: parseTime(startTime) + durationMinutes };

    const dayInfo = await this.schedulesService.getEffectiveDayInfo(clinicId, doctorId, branchId, dateStr);
    if (dayInfo.isFullyClosed) {
      throw new ConflictException(dayInfo.closureReason ? `Doctor unavailable: ${dayInfo.closureReason}` : 'Doctor unavailable on this date');
    }

    const fitsWorkingHours = dayInfo.workingRanges.some((r) => requested.start >= r.start && requested.end <= r.end);
    if (!fitsWorkingHours) throw new ConflictException('Requested time is outside the doctor\'s working hours');

    if (dayInfo.blockedRanges.some((r) => rangesOverlap(requested, r))) {
      throw new ConflictException('Requested time overlaps a break or blocked period');
    }

    const existing = await this.appointmentModel.find({
      clinicId,
      doctorId,
      branchId,
      date: startOfUtcDay(dateStr),
      status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    });

    const booked: TimeRange[] = existing.map((a) => ({ start: parseTime(a.startTime), end: parseTime(a.endTime) }));
    if (booked.some((b) => rangesOverlap(requested, b))) {
      throw new ConflictException('This time slot is already booked');
    }
  }

  async create(clinicId: string, user: AuthenticatedUser, dto: CreateAppointmentDto) {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient || patient.clinicId.toString() !== clinicId) throw new NotFoundException('Patient not found');

    const doctor = await this.doctorsService.findOne(clinicId, dto.doctorId);
    if (!doctor.branchIds.some((b) => b.toString() === dto.branchId)) {
      throw new ConflictException('Doctor is not assigned to this branch');
    }

    // One pending appointment per patient/doctor at a time — they must cancel
    // or complete the existing one before booking another with the same doctor.
    const existingActive = await this.appointmentModel.findOne({
      clinicId,
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
    });
    if (existingActive) {
      throw new ConflictException('This patient already has a pending appointment with this doctor');
    }

    const durationMinutes = dto.durationMinutes ?? doctor.defaultAppointmentDurationMinutes;
    await this.assertSlotIsFree(clinicId, dto.doctorId, dto.branchId, dto.date, dto.startTime, durationMinutes);

    const visitType = dto.visitType ?? VisitType.CONSULTATION;
    const price = visitType === VisitType.FOLLOW_UP ? doctor.followUpPrice : doctor.consultationPrice;

    const appointment = await this.appointmentModel.create({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(dto.doctorId),
      branchId: new Types.ObjectId(dto.branchId),
      patientId: new Types.ObjectId(dto.patientId),
      date: startOfUtcDay(dto.date),
      startTime: dto.startTime,
      endTime: formatTime(parseTime(dto.startTime) + durationMinutes),
      durationMinutes,
      visitType,
      status: AppointmentStatus.SCHEDULED,
      price,
      reason: dto.reason,
      notes: dto.notes,
      createdBy: new Types.ObjectId(user.userId),
    });

    await this.notifyDoctor(
      clinicId,
      dto.doctorId,
      NotificationType.APPOINTMENT_BOOKED,
      'New appointment booked',
      `${patient.fullName} booked ${visitType === VisitType.FOLLOW_UP ? 'a follow-up' : 'a consultation'} on ${dto.date} at ${dto.startTime}`,
    );
    await this.notifyPatient(clinicId, patient, doctor.fullName, 'booked', dto.date, dto.startTime);

    return this.enrich([appointment]).then((r) => r[0]);
  }

  async findAll(clinicId: string, query: QueryAppointmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const filter: FilterQuery<AppointmentDocument> = { clinicId };
    if (query.date) filter.date = startOfUtcDay(query.date);
    else if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = startOfUtcDay(query.from);
      if (query.to) range.$lte = startOfUtcDay(query.to);
      filter.date = range;
    }
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.branchId) filter.branchId = query.branchId;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .sort({ date: 1, startTime: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.appointmentModel.countDocuments(filter),
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
    const appointment = await this.findRaw(clinicId, id);
    return this.enrich([appointment]).then((r) => r[0]);
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.findRaw(clinicId, id);

    const reschedule = dto.date !== undefined || dto.startTime !== undefined || dto.durationMinutes !== undefined;
    if (reschedule && appointment.status !== AppointmentStatus.CANCELLED) {
      const dateStr = dto.date ?? appointment.date.toISOString().slice(0, 10);
      const startTime = dto.startTime ?? appointment.startTime;
      const durationMinutes = dto.durationMinutes ?? appointment.durationMinutes;
      await this.assertSlotIsFree(
        clinicId,
        appointment.doctorId.toString(),
        appointment.branchId.toString(),
        dateStr,
        startTime,
        durationMinutes,
        id,
      );
      appointment.date = startOfUtcDay(dateStr);
      appointment.startTime = startTime;
      appointment.durationMinutes = durationMinutes;
      appointment.endTime = formatTime(parseTime(startTime) + durationMinutes);
    }

    if (dto.status !== undefined) appointment.status = dto.status;
    if (dto.reason !== undefined) appointment.reason = dto.reason;
    if (dto.notes !== undefined) appointment.notes = dto.notes;

    await appointment.save();
    return this.enrich([appointment]).then((r) => r[0]);
  }

  async cancel(clinicId: string, user: AuthenticatedUser, id: string, dto: CancelAppointmentDto) {
    const appointment = await this.findRaw(clinicId, id);
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelReason = dto.reason;
    appointment.cancelledBy = new Types.ObjectId(user.userId);
    appointment.cancelledAt = new Date();
    await appointment.save();

    const [patient, doctor] = await Promise.all([
      this.patientModel.findById(appointment.patientId, { fullName: 1, email: 1, phone: 1 }),
      this.doctorsService.findOne(clinicId, appointment.doctorId.toString()).catch(() => null),
    ]);
    const dateStr = appointment.date.toISOString().slice(0, 10);
    await this.notifyDoctor(
      clinicId,
      appointment.doctorId.toString(),
      NotificationType.APPOINTMENT_CANCELLED,
      'Appointment cancelled',
      `${patient?.fullName ?? 'A patient'}'s appointment on ${dateStr} at ${appointment.startTime} was cancelled${dto.reason ? `: ${dto.reason}` : ''}`,
    );
    await this.notifyPatient(clinicId, patient, doctor?.fullName ?? 'your doctor', 'cancelled', dateStr, appointment.startTime, dto.reason);

    return this.enrich([appointment]).then((r) => r[0]);
  }

  /** Attaches lightweight patient/doctor display fields without a full populate(). */
  private async enrich(appointments: AppointmentDocument[]) {
    if (appointments.length === 0) return [];
    const clinicId = appointments[0].clinicId.toString();
    const patientIds = [...new Set(appointments.map((a) => a.patientId.toString()))];
    const doctorIds = [...new Set(appointments.map((a) => a.doctorId.toString()))];

    const [patients, doctors] = await Promise.all([
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, phone: 1 }),
      this.doctorsService.findByIds(clinicId, doctorIds),
    ]);

    const patientMap = new Map(patients.map((p) => [p.id, p]));
    const doctorMap = new Map(doctors.filter((d): d is NonNullable<typeof d> => !!d).map((d) => [d.id, d]));

    return appointments.map((a) => {
      const obj = a.toObject();
      const patient = patientMap.get(a.patientId.toString());
      const doctor = doctorMap.get(a.doctorId.toString());
      return {
        ...obj,
        date: a.date.toISOString().slice(0, 10),
        patientName: patient?.fullName,
        patientPhone: patient?.phone,
        doctorName: doctor?.fullName,
      };
    });
  }
}
