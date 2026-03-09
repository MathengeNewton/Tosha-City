import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Beef' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Unit of measurement', example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Retail price per unit', example: 800.0 })
  @IsNumber()
  @Min(0)
  defaultPrice: number;

  @ApiProperty({ description: 'Wholesale price per unit (optional)', example: 720.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @ApiProperty({ description: 'Whether product is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Parent product ID for byproducts (e.g., Beef for Minced Meat)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  parentProductId?: number;
}

