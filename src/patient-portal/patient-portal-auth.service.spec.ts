import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PatientPortalAuthService } from './patient-portal-auth.service';

const CLINIC = { id: 'clinic-1', name: 'Demo Clinic' };

describe('PatientPortalAuthService', () => {
  let service: PatientPortalAuthService;
  let patientModel: { exists: jest.Mock; create: jest.Mock; findOne: jest.Mock };
  let clinicsService: { findBySlug: jest.Mock };
  let smsService: { send: jest.Mock };
  let mailService: { sendPatientOtp: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    patientModel = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    clinicsService = { findBySlug: jest.fn().mockResolvedValue(CLINIC) };
    smsService = { send: jest.fn().mockResolvedValue(undefined) };
    mailService = { sendPatientOtp: jest.fn().mockResolvedValue(undefined) };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    config = { get: jest.fn().mockReturnValue('secret') };

    service = new PatientPortalAuthService(
      patientModel as never,
      clinicsService as never,
      smsService as never,
      mailService as never,
      jwtService as never,
      config as never,
    );
  });

  describe('register', () => {
    it('rejects a phone number already registered for the clinic', async () => {
      patientModel.exists.mockResolvedValueOnce({ _id: 'existing' });

      await expect(service.register('demo-clinic', 'New Patient', '01000000001')).rejects.toThrow(
        'An account with this phone number already exists.',
      );
      expect(patientModel.create).not.toHaveBeenCalled();
    });

    it('rejects an email already registered for the clinic', async () => {
      patientModel.exists.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: 'existing' });

      await expect(
        service.register('demo-clinic', 'New Patient', '01000000002', 'taken@example.com'),
      ).rejects.toThrow(ConflictException);
      expect(patientModel.create).not.toHaveBeenCalled();
    });

    it('creates the patient and triggers an OTP send when phone and email are both free', async () => {
      patientModel.exists.mockResolvedValue(null);
      patientModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        then: undefined,
      });
      // requestOtp looks the patient back up via findPatient -> findOne(...).select is only
      // used when withOtpFields=true; register() calls requestOtp without OTP fields, so
      // findOne must resolve directly (it's awaited, not chained with .select()).
      patientModel.findOne.mockResolvedValue({
        phone: '01000000003',
        email: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.register('demo-clinic', 'New Patient', '01000000003');

      expect(patientModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1', fullName: 'New Patient', phone: '01000000003' }),
      );
      expect(result.message).toMatch(/verification code/);
    });

    it('scopes the uniqueness check to the resolved clinic, not globally', async () => {
      patientModel.exists.mockResolvedValue(null);
      patientModel.findOne.mockResolvedValue({ save: jest.fn().mockResolvedValue(undefined) });

      await service.register('demo-clinic', 'New Patient', '01000000004');

      expect(patientModel.exists).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1', phone: '01000000004' }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('rejects when no patient matches the phone/email', async () => {
      patientModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(service.verifyOtp('demo-clinic', '01000000001', undefined, '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired code', async () => {
      patientModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          otpCodeHash: await argon2.hash('123456'),
          otpExpiresAt: new Date(Date.now() - 1000),
        }),
      });

      await expect(service.verifyOtp('demo-clinic', '01000000001', undefined, '123456')).rejects.toThrow(
        'Invalid or expired code',
      );
    });

    it('rejects a wrong code', async () => {
      patientModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          otpCodeHash: await argon2.hash('123456'),
          otpExpiresAt: new Date(Date.now() + 60000),
        }),
      });

      await expect(service.verifyOtp('demo-clinic', '01000000001', undefined, '000000')).rejects.toThrow(
        'Invalid or expired code',
      );
    });

    it('issues a token scoped to the patient and clinic on a valid code', async () => {
      const patientDoc = {
        id: 'patient-1',
        fullName: 'Test Patient',
        otpCodeHash: await argon2.hash('123456'),
        otpExpiresAt: new Date(Date.now() + 60000),
        save: jest.fn().mockResolvedValue(undefined),
      };
      patientModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(patientDoc) });

      const result = await service.verifyOtp('demo-clinic', '01000000001', undefined, '123456');

      expect(patientDoc.otpCodeHash).toBeUndefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'patient-1', clinicId: 'clinic-1' }),
        expect.anything(),
      );
      expect(result.accessToken).toBe('signed-token');
    });
  });
});
