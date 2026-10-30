import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MpesaChannel, PaymentMethod } from '../../sales/entities/payment.enums';

export class RecordRestaurantOrderPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ required: false, description: 'Override amount (defaults to sale total)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty({ required: false, enum: MpesaChannel })
  @IsOptional()
  @IsEnum(MpesaChannel)
  mpesaChannel?: MpesaChannel;

  @ApiProperty({ required: false, description: 'M-Pesa code or PDQ slip reference' })
  @IsOptional()
  @IsString()
  reference?: string;
}
