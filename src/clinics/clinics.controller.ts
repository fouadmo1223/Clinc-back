import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { requireClinicId } from '../common/utils/require-clinic-id';

const ALLOWED_LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('clinics')
@ApiBearerAuth()
@Controller('clinics/me')
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.findById(requireClinicId(user));
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  updateMine(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(requireClinicId(user), dto);
  }

  @Post('logo')
  @ApiConsumes('multipart/form-data')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_LOGO_SIZE_BYTES) throw new BadRequestException('File exceeds the 5MB limit');
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Allowed: JPEG, PNG, WEBP, SVG');
    }
    return this.clinicsService.updateLogo(requireClinicId(user), file);
  }
}
