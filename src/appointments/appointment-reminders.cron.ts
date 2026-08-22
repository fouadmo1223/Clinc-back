import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { DoctorsService } from '../doctors/doctors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { formatTime, parseTime } from '../common/utils/time.util';

const REMINDER_WINDOW_MINUTES = 60;
const REMINDER_WINDOW_MS = REMINDER_WINDOW_MINUTES * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Every 15 minutes, notifies doctors about their own appointments starting within the next hour. */
@Injectable()
export class AppointmentRemindersCron {
  private readonly logger = new Logger('AppointmentReminders');

  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private doctorsService: DoctorsService,
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

    const clinicId = claimed[0].clinicId.toString();
    const doctorIds = [...new Set(claimed.map((a) => a.doctorId.toString()))];
    const patientIds = [...new Set(claimed.map((a) => a.patientId.toString()))];
    const [doctors, patients] = await Promise.all([
      this.doctorsService.findByIds(clinicId, doctorIds),
      this.patientModel.find({ _id: { $in: patientIds } }, { fullName: 1 }),
    ]);
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    await Promise.all(
      claimed.map((appointment) =>
        this.notificationsService.notifyDoctorIfLinked({
          clinicId: appointment.clinicId.toString(),
          doctor: doctorMap.get(appointment.doctorId.toString()),
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Upcoming appointment',
          message: `${patientMap.get(appointment.patientId.toString())?.fullName ?? 'A patient'} at ${formatTime(parseTime(appointment.startTime))} (in under an hour)`,
          link: '/appointments',
        }),
      ),
    );

    this.logger.log(`Sent ${claimed.length} appointment reminder(s)`);
  }
}
