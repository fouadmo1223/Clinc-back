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
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    const candidates = await this.appointmentModel.find({
      date: today,
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
      reminderSent: false,
    });

    const due = candidates.filter((a) => {
      const start = parseTime(a.startTime);
      return start >= nowMinutes && start - nowMinutes <= REMINDER_WINDOW_MINUTES;
    });
    if (due.length === 0) return;

    for (const appointment of due) {
      const clinicId = appointment.clinicId.toString();
      const [doctor, patient] = await Promise.all([
        this.doctorsService.findOne(clinicId, appointment.doctorId.toString()).catch(() => null),
        this.patientModel.findById(appointment.patientId, { fullName: 1 }),
      ]);

      if (doctor?.userId) {
        await this.notificationsService.create({
          clinicId,
          userId: doctor.userId.toString(),
          type: NotificationType.APPOINTMENT_REMINDER,
          title: 'Upcoming appointment',
          message: `${patient?.fullName ?? 'A patient'} at ${formatTime(parseTime(appointment.startTime))} (in under an hour)`,
          link: '/appointments',
          email: doctor.email,
        });
      }

      appointment.reminderSent = true;
      await appointment.save();
    }

    this.logger.log(`Sent ${due.length} appointment reminder(s)`);
  }
}
