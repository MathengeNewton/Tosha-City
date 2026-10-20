import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class SetCustomerPriceDto {
  @ApiProperty({ description: 'Special wholesale price per unit for this customer', example: 520.0 })
  @IsNumber()
  @Min(0.01)
  price: number;
}
