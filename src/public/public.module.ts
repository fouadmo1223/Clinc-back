import { Module } from '@nestjs/common';
import { ClinicsModule } from '../clinics/clinics.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [ClinicsModule, DoctorsModule, ReviewsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
