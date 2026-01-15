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

  @ApiProperty({ description: 'Default price per unit', example: 800.0 })
  @IsNumber()
  @Min(0)
  defaultPrice: number;

  @ApiProperty({ description: 'Whether product is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

