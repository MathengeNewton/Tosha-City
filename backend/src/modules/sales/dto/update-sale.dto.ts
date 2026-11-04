import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

export class UpdateSaleDto extends PartialType(CreateSaleDto) {
  @ApiProperty({ description: 'M-Pesa code or PDQ slip reference when correcting a paid sale', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

