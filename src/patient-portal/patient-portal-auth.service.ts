import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { SmsService } from '../common/sms/sms.service';
import { MailService } from '../mail/mail.service';
import { PatientJwtPayload } from './strategies/patient-jwt.strategy';

const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class PatientPortalAuthService {
  private readonly logger = new Logger('PatientPortalAuth');

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private clinicsService: ClinicsService,
    private smsService: SmsService,
    private mailService: MailService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private async findPatient(
    clinicId: string,
    phone?: string,
    email?: string,
    withOtpFields = false,
  ): Promise<PatientDocument | null> {
    const filter = phone ? { clinicId, phone, isActive: true } : email ? { clinicId, email: email.toLowerCase(), isActive: true } : null;
    if (!filter) return null;
    const query = this.patientModel.findOne(filter);
    return withOtpFields ? query.select('+otpCodeHash +otpExpiresAt') : query;
  }

  /**
   * Self-service account creation: a new patient (not yet known to the clinic) picks their
   * own name/phone/email. Phone is always required and must be unique per clinic; email, if
   * given, must be unique too. Unlike requestOtp, this intentionally DOES reveal whether the
   * phone/email is taken — you can't register into an account you don't already know exists,
   * so there's no enumeration risk the way there is for login.
   */
  async register(clinicSlug: string, fullName: string, phone: string, email?: string): Promise<{ message: string }> {
    const clinic = await this.clinicsService.findBySlug(clinicSlug);

    const phoneTaken = await this.patientModel.exists({ clinicId: clinic.id, phone, isActive: true });
    if (phoneTaken) throw new ConflictException('An account with this phone number already exists.');

    if (email) {
      const emailTaken = await this.patientModel.exists({ clinicId: clinic.id, email: email.toLowerCase(), isActive: true });
      if (emailTaken) throw new ConflictException('An account with this email already exists.');
    }

    await this.patientModel.create({ clinicId: clinic.id, fullName, phone, email });

    return this.requestOtp(clinicSlug, phone, undefined);
  }

  /** Always responds the same way whether or not the phone/email matches a patient, so the endpoint can't be used to enumerate patients. */
  async requestOtp(clinicSlug: string, phone: string | undefined, email: string | undefined): Promise<{ message: string }> {
    if (!phone && !email) throw new BadRequestException('A phone number or email is required');
    const message = { message: 'If that phone number or email is on file, a verification code has been sent.' };

    const clinic = await this.clinicsService.findBySlug(clinicSlug).catch(() => null);
    if (!clinic) return message;

    const patient = await this.findPatient(clinic.id, phone, email);
    if (!patient) return message;

    const code = randomInt(100000, 1000000).toString();
    patient.otpCodeHash = await argon2.hash(code);
    patient.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await patient.save();

    // Sent via whichever identifier the patient logged in with, not both — a patient who
    // typed their email doesn't necessarily want an SMS charge/notification too.
    if (phone) {
      await this.smsService
        .send(patient.phone, `Your ${clinic.name} verification code is ${code}. It expires in 10 minutes.`)
        .catch((err) => this.logger.warn(`Failed to send OTP SMS: ${(err as Error).message}`));
    } else if (patient.email) {
      await this.mailService
        .sendPatientOtp(patient.email, code, clinic.name)
        .catch((err) => this.logger.warn(`Failed to send OTP email: ${(err as Error).message}`));
    }

    return message;
  }

  async verifyOtp(
    clinicSlug: string,
    phone: string | undefined,
    email: string | undefined,
    code: string,
  ): Promise<{ accessToken: string; patient: { id: string; fullName: string; clinicName: string } }> {
    if (!phone && !email) throw new UnauthorizedException('Invalid code');
    const clinic = await this.clinicsService.findBySlug(clinicSlug).catch(() => null);
    if (!clinic) throw new UnauthorizedException('Invalid code');

    const patient = await this.findPatient(clinic.id, phone, email, true);
    if (!patient?.otpCodeHash || !patient.otpExpiresAt || patient.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const valid = await argon2.verify(patient.otpCodeHash, code);
    if (!valid) throw new UnauthorizedException('Invalid or expired code');

    patient.otpCodeHash = undefined;
    patient.otpExpiresAt = undefined;
    await patient.save();

    const payload: PatientJwtPayload = { sub: patient.id, clinicId: clinic.id };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.patientSecret'),
      expiresIn: this.config.get<string>('jwt.patientExpiresIn'),
    });

    return {
      accessToken,
      patient: { id: patient.id, fullName: patient.fullName, clinicName: clinic.name },
    };
  }
}
