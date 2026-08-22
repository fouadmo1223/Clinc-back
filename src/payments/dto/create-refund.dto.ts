import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreateRefundDto {
  @IsMongoId()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
