import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * Thin abstraction over the SMS provider, mirroring MailService: when Twilio
 * isn't configured, sends are logged and skipped instead of throwing, so
 * local/dev environments work without real credentials.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;
  private fromNumber: string | undefined;
  private defaultCountryCode: string;

  constructor(private config: ConfigService) {
    const accountSid = config.get<string>('sms.accountSid');
    const authToken = config.get<string>('sms.authToken');
    this.fromNumber = config.get<string>('sms.fromNumber');
    this.defaultCountryCode = config.get<string>('sms.defaultCountryCode') ?? '+20';
    if (accountSid && authToken && this.fromNumber) {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  /** Normalizes a local-format number (e.g. "01xxxxxxxxx") to E.164 by prefixing the default country code; leaves already-international numbers untouched. */
  private toE164(phone: string): string {
    const trimmed = phone.trim().replace(/[\s-]/g, '');
    if (trimmed.startsWith('+')) return trimmed;
    return `${this.defaultCountryCode}${trimmed.replace(/^0+/, '')}`;
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client || !this.fromNumber) {
      this.logger.warn(`SMS provider not configured — SMS to ${to} not sent. Body: "${body}"`);
      return;
    }
    await this.client.messages.create({ to: this.toE164(to), from: this.fromNumber, body });
  }

  async sendPatientAppointmentBooked(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string },
  ) {
    await this.send(
      to,
      `Hi ${params.patientName}, your appointment with Dr. ${params.doctorName} at ${params.clinicName} is confirmed for ${params.date} at ${params.time}.`,
    );
  }

  async sendPatientAppointmentReminder(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string },
  ) {
    await this.send(
      to,
      `Hi ${params.patientName}, reminder: your appointment with Dr. ${params.doctorName} at ${params.clinicName} is today at ${params.time}.`,
    );
  }

  async sendPatientAppointmentCancelled(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string; reason?: string },
  ) {
    await this.send(
      to,
      `Hi ${params.patientName}, your appointment with Dr. ${params.doctorName} on ${params.date} at ${params.time} was cancelled.${params.reason ? ` Reason: ${params.reason}` : ''}`,
    );
  }
}
