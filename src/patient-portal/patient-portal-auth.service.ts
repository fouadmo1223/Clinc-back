import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { ClinicsService } from '../clinics/clinics.service';
import { SmsService } from '../common/sms/sms.service';
import { PatientJwtPayload } from './strategies/patient-jwt.strategy';

const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class PatientPortalAuthService {
  private readonly logger = new Logger('PatientPortalAuth');

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private clinicsService: ClinicsService,
    private smsService: SmsService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /** Always responds the same way whether or not the phone matches a patient, so the endpoint can't be used to enumerate patients by phone number. */
  async requestOtp(clinicSlug: string, phone: string): Promise<{ message: string }> {
    const clinic = await this.clinicsService.findBySlug(clinicSlug).catch(() => null);
    const message = { message: 'If that phone number is on file, a verification code has been sent.' };
    if (!clinic) return message;

    const patient = await this.patientModel.findOne({ clinicId: clinic.id, phone, isActive: true });
    if (!patient) return message;

    const code = randomInt(100000, 1000000).toString();
    patient.otpCodeHash = await argon2.hash(code);
    patient.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await patient.save();

    await this.smsService
      .send(patient.phone, `Your ${clinic.name} verification code is ${code}. It expires in 10 minutes.`)
      .catch((err) => this.logger.warn(`Failed to send OTP SMS: ${(err as Error).message}`));

    return message;
  }

  async verifyOtp(clinicSlug: string, phone: string, code: string): Promise<{ accessToken: string; patient: { id: string; fullName: string; clinicName: string } }> {
    const clinic = await this.clinicsService.findBySlug(clinicSlug).catch(() => null);
    if (!clinic) throw new UnauthorizedException('Invalid code');

    const patient = await this.patientModel
      .findOne({ clinicId: clinic.id, phone, isActive: true })
      .select('+otpCodeHash +otpExpiresAt');
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
