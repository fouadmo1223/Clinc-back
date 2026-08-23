import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

/** Fully unauthenticated marketing-site data: no patient/staff auth, no clinicId trust from the client — everything is resolved from the URL slug. */
@ApiTags('public')
@Public()
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('public/:slug')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('clinic')
  getClinic(@Param('slug') slug: string) {
    return this.publicService.getClinic(slug);
  }

  @Get('doctors')
  listDoctors(@Param('slug') slug: string) {
    return this.publicService.listDoctors(slug);
  }

  @Get('doctors/:doctorId/reviews')
  listDoctorReviews(@Param('slug') slug: string, @Param('doctorId') doctorId: string) {
    return this.publicService.listDoctorReviews(slug, doctorId);
  }
}
