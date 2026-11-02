import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
} from '../entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Stock session ID', example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.TRANSPORT,
  })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({
    description: 'What the money was spent on',
    example: 'Boda boda to collect meat',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ description: 'Amount paid (KES)', example: 300 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Where the money came from',
    enum: ExpensePaymentMethod,
    required: false,
    default: ExpensePaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @ApiProperty({
    description: 'Receipt photo URL (from /uploads)',
    required: false,
  })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
