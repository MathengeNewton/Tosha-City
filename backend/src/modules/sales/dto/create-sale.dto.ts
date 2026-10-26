import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, ValidateNested, Min, IsOptional, IsBoolean, IsString } from 'class-validator';
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

  @ApiProperty({ description: 'Unit price. Cashiers cannot override this; the catalog price is used.', example: 800.0, required: false })
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ description: 'Cook this meat in the kitchen (adds the per-kg cooking fee)', required: false })
  @IsOptional()
  @IsBoolean()
  cookInKitchen?: boolean;
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

  @ApiProperty({
    description: 'When set, links this sale to a restaurant/kitchen order (validated server-side)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  restaurantOrderId?: number;

  @ApiProperty({ description: 'Table label, e.g. B1 or Shade 3', required: false })
  @IsOptional()
  @IsString()
  tableLabel?: string;
}

export class AddSaleItemsDto {
  @ApiProperty({ description: 'Items to add to an unpaid sale', type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}

