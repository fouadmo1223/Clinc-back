import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../common/sms/sms.service';
import { ClinicsService } from '../clinics/clinics.service';

export interface CreateNotificationInput {
  clinicId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** When set, also emails this address the same title/message — used for notifications urgent enough to warrant email (bookings, cancellations, reminders), not noisy real-time ones (queue check-ins). */
  email?: string;
}

export interface NotifiableDoctor {
  userId?: Types.ObjectId;
  email: string;
}

export interface NotifiablePatient {
  email?: string;
  phone?: string;
  fullName: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private mailService: MailService,
    private smsService: SmsService,
    private clinicsService: ClinicsService,
  ) {}

  /** Called from other services as a side effect of their own action — a failure here must never break that action. */
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      await this.notificationModel.create({
        clinicId: new Types.ObjectId(input.clinicId),
        userId: new Types.ObjectId(input.userId),
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      });
    } catch (err) {
      this.logger.warn(`Failed to create notification: ${(err as Error).message}`);
    }

    if (input.email) {
      await this.mailService
        .sendNotificationEmail(input.email, input.title, input.message, input.link)
        .catch((err) => this.logger.warn(`Failed to email notification: ${(err as Error).message}`));
    }
  }

  /**
   * Shared by every caller that notifies "a doctor" about something — doctors without a
   * linked login are silently skipped. `sendEmail` defaults to true; pass false for noisy
   * real-time signals (e.g. queue check-ins) that aren't worth an email.
   */
  async notifyDoctorIfLinked(params: {
    clinicId: string;
    doctor: NotifiableDoctor | null | undefined;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    sendEmail?: boolean;
  }): Promise<void> {
    if (!params.doctor?.userId) return;
    await this.create({
      clinicId: params.clinicId,
      userId: params.doctor.userId.toString(),
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      email: (params.sendEmail ?? true) ? params.doctor.email : undefined,
    });
  }

  /**
   * The patient-side counterpart to notifyDoctorIfLinked() — emails (if the patient has one
   * on file) and always texts (phone is required for every patient) about a booked,
   * cancelled, or soon-starting appointment. Only requires a patient; the doctor's name is
   * just display text, so a missing/deleted doctor record never blocks the patient notice.
   */
  async notifyPatient(params: {
    clinicId: string;
    patient: NotifiablePatient | null | undefined;
    doctorName: string;
    kind: 'booked' | 'cancelled' | 'reminder';
    date: string;
    time: string;
    reason?: string;
  }): Promise<void> {
    if (!params.patient) return;
    const { patient, doctorName, kind, date, time, reason } = params;
    const clinic = await this.clinicsService.findById(params.clinicId).catch(() => null);
    const base = { patientName: patient.fullName, doctorName, clinicName: clinic?.name ?? 'the clinic', date, time };

    const tasks: Promise<void>[] = [];
    if (patient.email) {
      tasks.push(
        kind === 'booked'
          ? this.mailService.sendPatientAppointmentBooked(patient.email, base)
          : kind === 'cancelled'
            ? this.mailService.sendPatientAppointmentCancelled(patient.email, { ...base, reason })
            : this.mailService.sendPatientAppointmentReminder(patient.email, base),
      );
    }
    if (patient.phone) {
      tasks.push(
        kind === 'booked'
          ? this.smsService.sendPatientAppointmentBooked(patient.phone, base)
          : kind === 'cancelled'
            ? this.smsService.sendPatientAppointmentCancelled(patient.phone, { ...base, reason })
            : this.smsService.sendPatientAppointmentReminder(patient.phone, base),
      );
    }
    await Promise.all(tasks.map((t) => t.catch(() => undefined)));
  }

  async findAll(clinicId: string, userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<NotificationDocument> = { clinicId, userId };
    if (query.unreadOnly) filter.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({ clinicId, userId, isRead: false }),
    ]);

    return { items, total, unreadCount, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async unreadCount(clinicId: string, userId: string) {
    const count = await this.notificationModel.countDocuments({ clinicId, userId, isRead: false });
    return { count };
  }

  async markRead(clinicId: string, userId: string, id: string) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.clinicId.toString() !== clinicId || notification.userId.toString() !== userId) {
      throw new ForbiddenException('Cross-clinic access denied');
    }
    notification.isRead = true;
    await notification.save();
    return notification;
  }

  async markAllRead(clinicId: string, userId: string) {
    await this.notificationModel.updateMany({ clinicId, userId, isRead: false }, { $set: { isRead: true } });
    return { success: true };
  }
}
