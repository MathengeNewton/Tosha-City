import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecipeIngredientDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ example: 'Salt' })
  @IsString()
  @IsNotEmpty()
  ingredientName: string;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  estimatedQuantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Mutura Large Batch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  finishedProductId: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0.01)
  expectedOutputQuantity: number;

  @ApiProperty({ example: 'portion' })
  @IsString()
  @IsNotEmpty()
  outputUnit: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [CreateRecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];
}
