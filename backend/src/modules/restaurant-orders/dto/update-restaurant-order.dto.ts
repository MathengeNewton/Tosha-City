import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateRestaurantOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableLabel?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ required: false, description: 'Staff member responsible for this table (same branch)' })
  @IsOptional()
  @IsNumber()
  assignedStaffId?: number | null;
}
