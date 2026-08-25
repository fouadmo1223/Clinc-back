import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { esc } from '../pdf/templates';

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
      const isProduction = config.get<string>('nodeEnv') === 'production';
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('smtp.port'),
        secure: config.get<number>('smtp.port') === 465,
        auth: {
          user: config.get<string>('smtp.user'),
          pass: config.get<string>('smtp.password'),
        },
        // Some local dev machines run antivirus/proxy software that intercepts outbound TLS
        // and presents its own certificate, which Node correctly rejects by default
        // ("self-signed certificate in certificate chain"). That's a local network quirk, not
        // a real MITM risk worth blocking on for local testing — but it must never be relaxed
        // in production, where a real MITM risk is exactly what cert validation protects against.
        ...(isProduction ? {} : { tls: { rejectUnauthorized: false } }),
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

  /** Every template shares this shell — a title, arbitrary body HTML the caller has already escaped, and an optional CTA button. */
  private wrap(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
    return `<div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>${esc(title)}</h2>
      ${bodyHtml}
      ${cta ? `<p><a href="${esc(cta.url)}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(cta.label)}</a></p>` : ''}
    </div>`;
  }

  async sendPasswordReset(to: string, fullName: string, resetUrl: string) {
    await this.send(
      to,
      'Reset your password',
      this.wrap(
        'Password reset',
        `<p>Hi ${esc(fullName)},</p>
         <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
         <p>If you didn't request this, you can safely ignore this email.</p>`,
        { label: 'Reset password', url: resetUrl },
      ),
    );
  }

  async sendAccountInvite(to: string, fullName: string, setupUrl: string) {
    await this.send(
      to,
      "You've been added to your clinic's workspace",
      this.wrap(
        `Welcome, ${esc(fullName)}`,
        `<p>An account has been created for you. Click below to set your password and sign in.</p>
         <p>This link expires in 7 days.</p>`,
        { label: 'Set your password', url: setupUrl },
      ),
    );
  }

  async sendPatientOtp(to: string, code: string, clinicName: string) {
    await this.send(
      to,
      `${clinicName} verification code`,
      this.wrap('Your verification code', `<p style="font-size:28px;font-weight:700;letter-spacing:0.3em">${esc(code)}</p><p>This code expires in 10 minutes.</p>`),
    );
  }

  /** Mirrors an in-app staff/doctor notification (appointment booked/cancelled/reminder) out to email. */
  async sendNotificationEmail(to: string, title: string, message: string, link?: string) {
    const appUrl = this.config.get<string>('appUrl');
    await this.send(
      to,
      title,
      this.wrap(title, `<p>${esc(message)}</p>`, link ? { label: 'Open in Clinic OS', url: `${appUrl}${link}` } : undefined),
    );
  }

  private async sendPatientAppointmentEmail(
    to: string,
    subject: string,
    title: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string },
    extraLine?: string,
  ) {
    await this.send(
      to,
      subject,
      this.wrap(
        title,
        `<p>Hi ${esc(params.patientName)},</p>
         <p>Your appointment with Dr. ${esc(params.doctorName)} at ${esc(params.clinicName)} is scheduled for
            ${esc(params.date)} at ${esc(params.time)}.</p>
         ${extraLine ? `<p>${esc(extraLine)}</p>` : ''}`,
      ),
    );
  }

  async sendPatientAppointmentBooked(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string },
  ) {
    await this.sendPatientAppointmentEmail(to, 'Appointment confirmed', 'Appointment confirmed', params);
  }

  async sendPatientAppointmentReminder(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string },
  ) {
    await this.sendPatientAppointmentEmail(to, 'Upcoming appointment reminder', 'See you soon', params, 'This is a reminder — we look forward to seeing you.');
  }

  async sendPatientAppointmentCancelled(
    to: string,
    params: { patientName: string; doctorName: string; clinicName: string; date: string; time: string; reason?: string },
  ) {
    await this.sendPatientAppointmentEmail(
      to,
      'Appointment cancelled',
      'Appointment cancelled',
      params,
      params.reason ? `Reason: ${params.reason}` : 'Please contact us if you’d like to rebook.',
    );
  }
}
