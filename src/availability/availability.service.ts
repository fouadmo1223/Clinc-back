import { Injectable } from '@nestjs/common';
import { SchedulesService } from '../schedules/schedules.service';
import { DoctorsService } from '../doctors/doctors.service';
import { subtractRanges, generateSlots, formatTime, TimeRange } from '../common/utils/time.util';

export interface AvailabilityResult {
  date: string;
  doctorId: string;
  branchId: string;
  durationMinutes: number;
  isFullyClosed: boolean;
  closureReason?: string;
  slots: { start: string; end: string }[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    private schedulesService: SchedulesService,
    private doctorsService: DoctorsService,
  ) {}

  /**
   * The core availability calculation: weekly schedule + exceptions (breaks,
   * leave, custom/extra hours, blocked time) minus already-booked appointment
   * intervals, sliced into fixed-duration slots.
   *
   * `bookedIntervals` is supplied by the appointments module (not built yet)
   * so a booked slot never shows as free — the conflict engine reuses this
   * exact subtractRanges() call rather than duplicating the logic.
   */
  async getAvailableSlots(
    clinicId: string,
    doctorId: string,
    branchId: string,
    dateStr: string,
    durationMinutes?: number,
    bookedIntervals: TimeRange[] = [],
  ): Promise<AvailabilityResult> {
    const doctor = await this.doctorsService.findOne(clinicId, doctorId);
    const duration = durationMinutes ?? doctor.defaultAppointmentDurationMinutes;

    const dayInfo = await this.schedulesService.getEffectiveDayInfo(clinicId, doctorId, branchId, dateStr);

    if (dayInfo.isFullyClosed) {
      return {
        date: dateStr,
        doctorId,
        branchId,
        durationMinutes: duration,
        isFullyClosed: true,
        closureReason: dayInfo.closureReason,
        slots: [],
      };
    }

    const free = subtractRanges(dayInfo.workingRanges, [...dayInfo.blockedRanges, ...bookedIntervals]);
    let slots = generateSlots(free, duration);

    // Don't offer slots that have already passed today.
    const now = new Date();
    const requestedDate = new Date(dateStr);
    const isToday =
      now.getUTCFullYear() === requestedDate.getUTCFullYear() &&
      now.getUTCMonth() === requestedDate.getUTCMonth() &&
      now.getUTCDate() === requestedDate.getUTCDate();
    if (isToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((s) => s.start > nowMinutes);
    }

    return {
      date: dateStr,
      doctorId,
      branchId,
      durationMinutes: duration,
      isFullyClosed: false,
      slots: slots.map((s) => ({ start: formatTime(s.start), end: formatTime(s.end) })),
    };
  }
}
