import { Global, Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { ExportService } from './export.service';

@Global()
@Module({
  providers: [PdfService, ExportService],
  exports: [PdfService, ExportService],
})
export class PdfModule {}
