import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRestaurantOrderLineDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
