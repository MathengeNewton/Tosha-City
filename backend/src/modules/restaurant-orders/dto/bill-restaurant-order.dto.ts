import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { MpesaChannel, PaymentMethod } from '../../sales/entities/payment.enums';

export class BillRestaurantOrderDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: MpesaChannel, required: false, description: 'Till or paybill for M-Pesa bills' })
  @IsOptional()
  @IsEnum(MpesaChannel)
  mpesaChannel?: MpesaChannel;

  @ApiProperty({ required: false, description: 'Credit customer id when payment is CREDIT' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({
    required: false,
    description:
      'If true, allow billing before all lines are served (cashier rush / pay first). Defaults to false.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  allowIncompleteServe?: boolean;
}
