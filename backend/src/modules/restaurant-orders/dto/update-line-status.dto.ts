import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RestaurantOrderLineStatus } from '../entities/restaurant-order-line.entity';

export class UpdateLineStatusDto {
  @ApiProperty({ enum: RestaurantOrderLineStatus })
  @IsEnum(RestaurantOrderLineStatus)
  status: RestaurantOrderLineStatus;
}
