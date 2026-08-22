import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Thin abstraction over the email transport. Swap the transporter (or the
 * whole service) to move providers later without touching call sites.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get<string>('smtp.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('smtp.port'),
        secure: config.get<number>('smtp.port') === 465,
        auth: {
          user: config.get<string>('smtp.user'),
          pass: config.get<string>('smtp.password'),
        },
      });
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — email to ${to} not sent. Subject: "${subject}"`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('smtp.from'),
      to,
      subject,
      html,
    });
  }

  async sendPasswordReset(to: string, fullName: string, resetUrl: string) {
    await this.send(
      to,
      'Reset your password',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Password reset</h2>
        <p>Hi ${fullName},</p>
        <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>`,
    );
  }

  async sendAccountInvite(to: string, fullName: string, setupUrl: string) {
    await this.send(
      to,
      "You've been added to your clinic's workspace",
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Welcome, ${fullName}</h2>
        <p>An account has been created for you. Click below to set your password and sign in.</p>
        <p><a href="${setupUrl}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Set your password</a></p>
        <p>This link expires in 7 days.</p>
      </div>`,
    );
  }

  async sendAppointmentConfirmation(to: string, params: { patientName: string; doctorName: string; date: string; time: string }) {
    await this.send(
      to,
      'Appointment confirmed',
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Appointment confirmed</h2>
        <p>Hi ${params.patientName},</p>
        <p>Your appointment with Dr. ${params.doctorName} is confirmed for ${params.date} at ${params.time}.</p>
      </div>`,
    );
  }
}
