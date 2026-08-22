import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { DoctorsService } from '../doctors/doctors.service';
import { ClinicsService } from '../clinics/clinics.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { formatTime, parseTime } from '../common/utils/time.util';

const REMINDER_WINDOW_MINUTES = 60;
const REMINDER_WINDOW_MS = REMINDER_WINDOW_MINUTES * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Every 15 minutes, notifies doctors (and emails patients) about appointments starting within the next hour, across every clinic. */
@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger('AppointmentReminders');

  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
    private clinicsService: ClinicsService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('*/15 * * * *')
  async sendUpcomingReminders() {
    const now = new Date();
    const today = startOfUtcDay(now);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Query both today's and tomorrow's UTC-day buckets so an appointment just after
    // midnight is still found while it's within the reminder window. `reminderSent` is
    // matched with $ne (not `false`) since appointments created before this field existed
    // have no value for it at all, and `{reminderSent: false}` would never match "missing".
    // Note: this intentionally spans every clinic (there's no clinicId filter) — the batch
    // lookups below must therefore be scoped per-clinic, not assumed to share one clinicId.
    const candidates = await this.appointmentModel.find({
      date: { $in: [today, tomorrow] },
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      reminderSent: { $ne: true },
    });

    // Compare absolute instants (date + startTime), not just startTime minutes-of-day,
    // so appointments due within the window but dated "tomorrow" are handled correctly.
    const due = candidates.filter((a) => {
      const apptInstant = a.date.getTime() + parseTime(a.startTime) * 60_000;
      const diffMs = apptInstant - now.getTime();
      return diffMs >= 0 && diffMs <= REMINDER_WINDOW_MS;
    });
    if (due.length === 0) return;

    // Atomically claim each appointment before sending — if a slow previous tick is still
    // processing when this one starts, findOneAndUpdate only succeeds for one of them,
    // preventing a duplicate reminder from being sent for the same appointment.
    const claimed: AppointmentDocument[] = [];
    for (const appointment of due) {
      const result = await this.appointmentModel.findOneAndUpdate(
        { _id: appointment._id, reminderSent: { $ne: true } },
        { $set: { reminderSent: true } },
      );
      if (result) claimed.push(appointment);
    }
    if (claimed.length === 0) return;

    const byClinic = new Map<string, AppointmentDocument[]>();
    for (const appointment of claimed) {
      const clinicId = appointment.clinicId.toString();
      const bucket = byClinic.get(clinicId);
      if (bucket) bucket.push(appointment);
      else byClinic.set(clinicId, [appointment]);
    }

    for (const [clinicId, appointments] of byClinic) {
      await this.sendRemindersForClinic(clinicId, appointments);
    }

    this.logger.log(`Sent ${claimed.length} appointment reminder(s) across ${byClinic.size} clinic(s)`);
  }

  private async sendRemindersForClinic(clinicId: string, appointments: AppointmentDocument[]) {
    const doctorIds = [...new Set(appointments.map((a) => a.doctorId.toString()))];
    const patientIds = [...new Set(appointments.map((a) => a.patientId.toString()))];
    const [clinic, doctors, patients] = await Promise.all([
      this.clinicsService.findById(clinicId).catch(() => null),
      this.doctorsService.findByIds(clinicId, doctorIds),
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1, email: 1 }),
    ]);
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    await Promise.all(
      appointments.map(async (appointment) => {
        const doctor = doctorMap.get(appointment.doctorId.toString());
        const patient = patientMap.get(appointment.patientId.toString());
        const dateStr = appointment.date.toISOString().slice(0, 10);
        const time = formatTime(parseTime(appointment.startTime));

        await this.notificationsService.notifyDoctorIfLinked({
          clinicId,
          doctor,
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Upcoming appointment',
          message: `${patient?.fullName ?? 'A patient'} at ${time} (in under an hour)`,
          link: '/appointments',
        });

        if (patient?.email && doctor) {
          await this.mailService
            .sendPatientAppointmentReminder(patient.email, {
              patientName: patient.fullName,
              doctorName: doctor.fullName,
              clinicName: clinic?.name ?? 'the clinic',
              date: dateStr,
              time,
            })
            .catch(() => undefined);
        }
      }),
    );
  }
}
