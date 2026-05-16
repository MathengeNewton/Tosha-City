import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty({ description: 'Session date (YYYY-MM-DD). Defaults to today if not provided', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Branch ID (admin only, optional if admin has a default branch)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  branchId?: number;
}

