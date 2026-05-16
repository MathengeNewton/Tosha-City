import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AdHocProductionIngredientDto {
  @ApiProperty({ example: 12, description: 'Stock product used as extra ingredient' })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0)
  actualQuantity: number;
}
