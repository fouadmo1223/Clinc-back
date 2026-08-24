import { ConflictException, ForbiddenException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let scheduleModel: { bulkWrite: jest.Mock; find: jest.Mock };
  let exceptionModel: { create: jest.Mock };
  let doctorsService: { findOne: jest.Mock };

  beforeEach(() => {
    scheduleModel = {
      bulkWrite: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    };
    exceptionModel = { create: jest.fn().mockResolvedValue({}) };
    doctorsService = { findOne: jest.fn() };

    service = new SchedulesService(scheduleModel as never, exceptionModel as never, doctorsService as never);
  });

  describe('setWeeklySchedule', () => {
    it('rejects when the doctor does not belong to the caller clinic (cross-tenant write attempt)', async () => {
      doctorsService.findOne.mockRejectedValue(new ForbiddenException('Cross-clinic access denied'));

      await expect(
        service.setWeeklySchedule('clinic-A', 'doctor-in-clinic-B', 'branch-1', { days: [] } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(scheduleModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('rejects when the doctor is not assigned to the given branch', async () => {
      doctorsService.findOne.mockResolvedValue({ branchIds: [{ toString: () => 'other-branch' }] });

      await expect(
        service.setWeeklySchedule('clinic-1', 'doctor-1', 'branch-1', { days: [] } as never),
      ).rejects.toThrow(ConflictException);
      expect(scheduleModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('scopes the bulkWrite filter by clinicId so it can never match another clinic\'s schedule row', async () => {
      const clinicId = '0'.repeat(23) + '1';
      const doctorId = '0'.repeat(23) + '2';
      const branchId = '0'.repeat(23) + '3';
      doctorsService.findOne.mockResolvedValue({ branchIds: [{ toString: () => branchId }] });

      await service.setWeeklySchedule(clinicId, doctorId, branchId, {
        days: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      } as never);

      expect(scheduleModel.bulkWrite).toHaveBeenCalledWith([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { clinicId, doctorId, branchId, dayOfWeek: 1 },
          }),
        }),
      ]);
    });
  });

  describe('createException', () => {
    it('rejects when the doctor does not belong to the caller clinic', async () => {
      doctorsService.findOne.mockRejectedValue(new ForbiddenException('Cross-clinic access denied'));

      await expect(
        service.createException('clinic-A', 'user-1', {
          doctorId: 'doctor-in-clinic-B',
          branchId: 'branch-1',
          date: '2099-01-01',
          type: 'FULL_DAY_LEAVE',
        } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(exceptionModel.create).not.toHaveBeenCalled();
    });
  });
});
