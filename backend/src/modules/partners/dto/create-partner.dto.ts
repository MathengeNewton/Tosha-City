import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner name', example: 'ABC Butchery' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Physical address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Whether partner is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
