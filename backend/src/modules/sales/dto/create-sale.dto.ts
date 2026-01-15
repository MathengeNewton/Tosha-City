import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, ValidateNested, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/payment.enums';

export class CreateSaleItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Quantity', example: 2.5 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Unit price (optional, uses product default if not provided)', example: 800.0, required: false })
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateSaleDto {
  @ApiProperty({ description: 'Stock session ID', example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'Sale items', type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Customer ID (required for credit sales)', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  customerId?: number;
}

