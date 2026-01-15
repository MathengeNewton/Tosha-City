import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty({ description: 'Session date (YYYY-MM-DD). Defaults to today if not provided', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;
}

