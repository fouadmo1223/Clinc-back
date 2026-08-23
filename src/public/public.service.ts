import { Injectable } from '@nestjs/common';
import { ClinicsService } from '../clinics/clinics.service';
import { DoctorsService } from '../doctors/doctors.service';
import { ReviewsService } from '../reviews/reviews.service';

@Injectable()
export class PublicService {
  constructor(
    private clinicsService: ClinicsService,
    private doctorsService: DoctorsService,
    private reviewsService: ReviewsService,
  ) {}

  async getClinic(slug: string) {
    const clinic = await this.clinicsService.findBySlug(slug);
    return {
      name: clinic.name,
      nameAr: clinic.nameAr,
      logoUrl: clinic.logoUrl,
      address: clinic.address,
      city: clinic.city,
      services: clinic.services,
    };
  }

  async listDoctors(slug: string) {
    const clinic = await this.clinicsService.findBySlug(slug);
    const doctors = await this.doctorsService.findAll(clinic.id, false);
    const summaries = await this.reviewsService.getSummaries(doctors.map((d) => d.id));

    return doctors
      .map((d) => ({
        id: d.id,
        fullName: d.fullName,
        photoUrl: d.photoUrl,
        specialty: d.specialty,
        specialtyAr: d.specialtyAr,
        bio: d.bio,
        consultationPrice: d.consultationPrice,
        branchIds: d.branchIds.map((b) => b.toString()),
        rating: summaries.get(d.id) ?? { average: 0, count: 0 },
      }))
      .sort((a, b) => b.rating.average - a.rating.average || b.rating.count - a.rating.count);
  }

  async listDoctorReviews(slug: string, doctorId: string) {
    const clinic = await this.clinicsService.findBySlug(slug);
    return this.reviewsService.listForDoctor(clinic.id, doctorId);
  }
}
