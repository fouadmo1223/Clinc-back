import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class InvoiceItemDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  branchId: string;

  @IsOptional()
  @IsMongoId()
  visitId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
