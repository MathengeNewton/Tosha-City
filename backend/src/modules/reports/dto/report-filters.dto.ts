import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsNumber } from 'class-validator';

export class ReportFiltersDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Product ID filter', required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ description: 'Session ID filter', required: false })
  @IsOptional()
  @IsNumber()
  sessionId?: number;
}

