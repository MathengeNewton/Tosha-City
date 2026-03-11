import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionIngredientAdjustmentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  recipeIngredientId: number;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @Min(0)
  actualQuantity: number;
}

export class CreateProductionRunDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  recipeId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 38 })
  @IsNumber()
  @Min(0.01)
  actualOutputQuantity: number;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wastedQuantity?: number;

  @ApiProperty({ required: false, example: 'Morning mutura prep' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ProductionIngredientAdjustmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionIngredientAdjustmentDto)
  ingredientAdjustments?: ProductionIngredientAdjustmentDto[];
}
