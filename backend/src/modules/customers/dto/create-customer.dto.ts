import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { CustomerType } from '../entities/customer.entity';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
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

  @ApiProperty({ description: 'Customer type', enum: CustomerType, example: CustomerType.REGULAR })
  @IsEnum(CustomerType)
  type: CustomerType;

  @ApiProperty({ description: 'Credit limit (for credit customers)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiProperty({ description: 'Payment terms (e.g., "Net 30")', required: false })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Whether customer is active', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



