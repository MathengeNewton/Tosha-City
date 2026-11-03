import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';
import { MpesaChannel } from '../entities/payment.enums';

export class UpdateSaleDto extends PartialType(CreateSaleDto) {
  @ApiProperty({ description: 'Till or paybill when correcting a paid M-Pesa sale', enum: MpesaChannel, required: false })
  @IsOptional()
  @IsEnum(MpesaChannel)
  mpesaChannel?: MpesaChannel;

  @ApiProperty({ description: 'M-Pesa code or PDQ slip reference when correcting a paid sale', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

