import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { User } from '../../users/entities/user.entity';

export enum ExpenseCategory {
  TRANSPORT = 'TRANSPORT',
  CASUAL_LABOUR = 'CASUAL_LABOUR',
  PACKAGING = 'PACKAGING',
  CLEANING = 'CLEANING',
  UTILITIES = 'UTILITIES',
  STAFF_MEALS = 'STAFF_MEALS',
  REPAIRS = 'REPAIRS',
  OTHER = 'OTHER',
}

export enum ExpensePaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
}

@Entity()
export class Expense {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Stock session (day) the expense was paid in' })
  @ManyToOne(() => StockSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: StockSession;

  @ApiProperty({ description: 'Session ID', example: 1 })
  @Column()
  sessionId: number;

  @ApiProperty({
    description: 'Expense category',
    enum: ExpenseCategory,
    example: ExpenseCategory.TRANSPORT,
  })
  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category: ExpenseCategory;

  @ApiProperty({
    description: 'What the money was spent on',
    example: 'Boda boda to collect meat',
  })
  @Column()
  description: string;

  @ApiProperty({ description: 'Amount paid (KES)', example: 300 })
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    description: 'Where the money came from',
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.CASH,
  })
  @Column({
    type: 'enum',
    enum: ExpensePaymentMethod,
    default: ExpensePaymentMethod.CASH,
  })
  paymentMethod: ExpensePaymentMethod;

  @ApiProperty({ description: 'Receipt photo URL', required: false })
  @Column({ type: 'varchar', nullable: true })
  receiptUrl: string | null;

  @ApiProperty({ description: 'User who recorded this expense' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @Column()
  recordedById: number;

  @ApiProperty({ description: 'When the expense was recorded' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
