import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, IsOptional } from 'class-validator';
import { StockEntryType } from '../entities/stock-entry.entity';

export class CreateStockEntryDto {
  @ApiProperty({ description: 'Stock session ID', example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Supplier ID (optional for incoming stock)', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiProperty({ description: 'Type of stock entry', enum: StockEntryType, example: StockEntryType.OPENING })
  @IsEnum(StockEntryType)
  type: StockEntryType;

  @ApiProperty({ description: 'Quantity. Only ADJUSTMENT entries may be negative.', example: 50.5 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Photo URL for wastage evidence', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

