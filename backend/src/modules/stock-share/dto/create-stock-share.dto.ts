import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateStockShareDto {
  @ApiProperty({ description: 'Partner ID', example: 1 })
  @IsNumber()
  partnerId: number;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Stock session ID (optional)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  sessionId?: number;

  @ApiProperty({ description: 'Quantity shared', example: 50.5 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Unit', example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
