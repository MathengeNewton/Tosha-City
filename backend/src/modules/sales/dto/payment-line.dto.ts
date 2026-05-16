import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.enums';

/** Tender line for cash/M-Pesa settlement (not CREDIT). */
export class PaymentLineDto {
  @ApiProperty({ enum: [PaymentMethod.CASH, PaymentMethod.MPESA] })
  @IsEnum(PaymentMethod)
  method: PaymentMethod.CASH | PaymentMethod.MPESA;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mpesaReference?: string;
}
