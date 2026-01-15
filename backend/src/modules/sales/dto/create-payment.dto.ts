import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Sale ID', example: 1 })
  @IsNumber()
  saleId: number;

  @ApiProperty({ description: 'Payment amount', example: 2000.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'MPESA reference (required if method is MPESA)', required: false })
  @IsOptional()
  @IsString()
  mpesaReference?: string;
}

