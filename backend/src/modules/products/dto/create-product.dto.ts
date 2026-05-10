import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, IsEnum } from 'class-validator';
import { BranchCatalogScope } from '../../../common/enums/branch-catalog-scope.enum';
import { ProductCategory, ProductSaleMode, ProductSegment } from '../entities/product.entity';

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

  @ApiProperty({ description: 'Product category', enum: ProductCategory, required: false })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiProperty({
    description: 'Business segment (must match category)',
    enum: ProductSegment,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductSegment)
  segment?: ProductSegment;

  @ApiProperty({ description: 'Product sale mode', enum: ProductSaleMode, required: false })
  @IsOptional()
  @IsEnum(ProductSaleMode)
  saleMode?: ProductSaleMode;

  @ApiProperty({ description: 'Optional sales prompt shown when selling this product', required: false })
  @IsOptional()
  @IsString()
  salesPrompt?: string;

  @ApiProperty({ description: 'Whether product is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Parent product ID for byproducts (e.g., Beef for Minced Meat)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  parentProductId?: number;

  @ApiProperty({
    description: 'Branch types that may sell this product',
    enum: BranchCatalogScope,
    required: false,
    default: BranchCatalogScope.ALL,
  })
  @IsOptional()
  @IsEnum(BranchCatalogScope)
  branchScope?: BranchCatalogScope;
}

