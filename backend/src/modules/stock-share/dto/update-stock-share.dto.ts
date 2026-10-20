import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ShareDirection } from '../entities/stock-share.entity';

export class UpdateStockShareDto {
  @ApiProperty({ enum: ShareDirection, required: false })
  @IsOptional()
  @IsEnum(ShareDirection)
  direction?: ShareDirection;

  @ApiProperty({ description: 'Partner ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  partnerId?: number;

  @ApiProperty({ description: 'Product ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ description: 'Quantity shared', required: false, example: 50.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ description: 'Unit', required: false, example: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Notes (empty string clears them)', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
