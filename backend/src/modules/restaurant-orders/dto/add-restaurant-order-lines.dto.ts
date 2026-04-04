import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRestaurantOrderLineDto } from './create-restaurant-order.dto';

export class AddRestaurantOrderLinesDto {
  @ApiProperty({ type: [CreateRestaurantOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRestaurantOrderLineDto)
  lines: CreateRestaurantOrderLineDto[];
}
