import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ShareDirection } from '../entities/stock-share.entity';

export class CreateStockShareDto {
  @ApiProperty({
    description: 'OUTGOING = we gave meat to the partner, INCOMING = we received meat from the partner',
    enum: ShareDirection,
    required: false,
    default: ShareDirection.OUTGOING,
  })
  @IsOptional()
  @IsEnum(ShareDirection)
  direction?: ShareDirection;

  @ApiProperty({ description: 'Partner ID', example: 1 })
  @IsNumber()
  partnerId: number;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({
    description: 'Stock session ID (optional for OUTGOING, required for INCOMING)',
    example: 1,
    required: false,
  })
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
