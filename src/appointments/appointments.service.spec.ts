import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from './schemas/appointment.schema';

function makeAppointmentDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'appt-1',
    clinicId: { toString: () => 'clinic-1' },
    doctorId: { toString: () => 'doctor-1' },
    branchId: { toString: () => 'branch-1' },
    patientId: { toString: () => 'patient-1' },
    date: new Date('2026-01-01T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:20',
    status: AppointmentStatus.SCHEDULED,
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      return { ...this };
    },
    ...overrides,
  };
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentModel: { findById: jest.Mock; findOne: jest.Mock; find: jest.Mock; create: jest.Mock; countDocuments: jest.Mock };
  let patientModel: { findById: jest.Mock; find: jest.Mock };
  let doctorsService: { findOne: jest.Mock; findByIds: jest.Mock };
  let schedulesService: { getEffectiveDayInfo: jest.Mock };
  let notificationsService: { notifyDoctorIfLinked: jest.Mock; notifyPatient: jest.Mock };

  beforeEach(() => {
    appointmentModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      countDocuments: jest.fn(),
    };
    patientModel = {
      findById: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    doctorsService = {
      findOne: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
    };
    schedulesService = {
      getEffectiveDayInfo: jest.fn(),
    };
    notificationsService = {
      notifyDoctorIfLinked: jest.fn().mockResolvedValue(undefined),
      notifyPatient: jest.fn().mockResolvedValue(undefined),
    };

    service = new AppointmentsService(
      appointmentModel as never,
      patientModel as never,
      doctorsService as never,
      schedulesService as never,
      notificationsService as never,
    );
  });

  describe('assertSlotIsFree (via create)', () => {
    beforeEach(() => {
      patientModel.findById.mockResolvedValue({ _id: 'patient-1', clinicId: { toString: () => 'clinic-1' }, fullName: 'Test Patient' });
      doctorsService.findOne.mockResolvedValue({
        _id: 'doctor-1',
        branchIds: [{ toString: () => 'branch-1' }],
        defaultAppointmentDurationMinutes: 20,
        consultationPrice: 100,
        fullName: 'Dr Test',
      });
      appointmentModel.findOne.mockResolvedValue(null);
    });

    it('rejects booking a date before today', async () => {
      await expect(
        service.create('clinic-1', {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          branchId: 'branch-1',
          date: '2000-01-01',
          startTime: '10:00',
        } as never),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create('clinic-1', {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          branchId: 'branch-1',
          date: '2000-01-01',
          startTime: '10:00',
        } as never),
      ).rejects.toThrow('Cannot book an appointment in the past');
    });

    it('rejects booking a time earlier today that has already passed', async () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      // 00:01 today will always be in the past by the time this test runs, except right at midnight.
      await expect(
        service.create('clinic-1', {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          branchId: 'branch-1',
          date: todayStr,
          startTime: '00:01',
        } as never),
      ).rejects.toThrow('This time has already passed today');
    });

    it('allows booking a future date once past-date guard clears', async () => {
      const hexId = '0'.repeat(23) + '1';
      patientModel.findById.mockResolvedValue({ _id: 'patient-1', clinicId: { toString: () => hexId }, fullName: 'Test Patient' });
      doctorsService.findOne.mockResolvedValue({
        _id: 'doctor-1',
        branchIds: [{ toString: () => hexId }],
        defaultAppointmentDurationMinutes: 20,
        consultationPrice: 100,
        fullName: 'Dr Test',
      });
      schedulesService.getEffectiveDayInfo.mockResolvedValue({
        isFullyClosed: false,
        workingRanges: [{ start: 0, end: 1439 }],
        blockedRanges: [],
      });
      appointmentModel.create.mockResolvedValue(makeAppointmentDoc());

      await expect(
        service.create(hexId, {
          patientId: hexId,
          doctorId: hexId,
          branchId: hexId,
          date: '2099-01-01',
          startTime: '10:00',
        } as never),
      ).resolves.toBeDefined();
    });
  });

  describe('cancelByPatient', () => {
    it('throws ForbiddenException when the appointment belongs to a different patient', async () => {
      appointmentModel.findById.mockResolvedValue(makeAppointmentDoc({ patientId: { toString: () => 'someone-else' } }));

      await expect(service.cancelByPatient('clinic-1', 'patient-1', 'appt-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when the appointment is already cancelled', async () => {
      appointmentModel.findById.mockResolvedValue(makeAppointmentDoc({ status: AppointmentStatus.CANCELLED }));

      await expect(service.cancelByPatient('clinic-1', 'patient-1', 'appt-1')).rejects.toThrow('This appointment is already cancelled.');
    });

    it('throws ConflictException when the appointment is already completed', async () => {
      appointmentModel.findById.mockResolvedValue(makeAppointmentDoc({ status: AppointmentStatus.COMPLETED }));

      await expect(service.cancelByPatient('clinic-1', 'patient-1', 'appt-1')).rejects.toThrow('A completed appointment cannot be cancelled.');
    });

    it('throws NotFoundException for a non-existent appointment', async () => {
      appointmentModel.findById.mockResolvedValue(null);

      await expect(service.cancelByPatient('clinic-1', 'patient-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for cross-clinic access', async () => {
      appointmentModel.findById.mockResolvedValue(makeAppointmentDoc({ clinicId: { toString: () => 'other-clinic' } }));

      await expect(service.cancelByPatient('clinic-1', 'patient-1', 'appt-1')).rejects.toThrow('Cross-clinic access denied');
    });

    it('cancels the appointment and notifies the doctor when ownership checks pass', async () => {
      const doc = makeAppointmentDoc() as ReturnType<typeof makeAppointmentDoc> & { cancelReason?: string };
      appointmentModel.findById.mockResolvedValue(doc);
      patientModel.findById.mockResolvedValue({ fullName: 'Test Patient' });
      doctorsService.findOne.mockResolvedValue({ _id: 'doctor-1', fullName: 'Dr Test' });

      const result = await service.cancelByPatient('clinic-1', 'patient-1', 'appt-1', 'Feeling better');

      expect(doc.status).toBe(AppointmentStatus.CANCELLED);
      expect(doc.cancelReason).toBe('Feeling better');
      expect(doc.save).toHaveBeenCalled();
      expect(notificationsService.notifyDoctorIfLinked).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'APPOINTMENT_CANCELLED' }),
      );
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });
  });
});
