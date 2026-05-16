import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, IsArray, IsInt, ValidateNested } from 'class-validator';
import { PaymentLineDto } from './payment-line.dto';

export class CreateSplitPaymentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  saleId: number;

  @ApiProperty({ type: [PaymentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  lines: PaymentLineDto[];
}
