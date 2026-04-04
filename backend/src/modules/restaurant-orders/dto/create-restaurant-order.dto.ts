import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, ValidateNested, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { RestaurantServiceType } from '../entities/restaurant-order.entity';

export class CreateRestaurantOrderLineDto {
  @ApiProperty()
  @IsNumber()
  productId: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRestaurantOrderDto {
  @ApiProperty()
  @IsNumber()
  sessionId: number;

  @ApiProperty({ enum: RestaurantServiceType })
  @IsEnum(RestaurantServiceType)
  serviceType: RestaurantServiceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableLabel?: string;

  @ApiProperty({ type: [CreateRestaurantOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRestaurantOrderLineDto)
  lines: CreateRestaurantOrderLineDto[];
}
