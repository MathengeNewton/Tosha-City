import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateSessionDto {
  @ApiProperty({ description: 'Session date (YYYY-MM-DD)', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;
}
