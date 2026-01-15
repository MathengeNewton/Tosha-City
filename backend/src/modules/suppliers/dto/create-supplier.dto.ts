import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ description: 'Supplier name', example: 'ABC Meat Suppliers' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Contact person name', required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

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

  @ApiProperty({ description: 'Whether supplier is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



