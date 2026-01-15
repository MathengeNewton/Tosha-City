import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';
import { SalePayment } from './sale-payment.entity';
import { PaymentMethod, PaymentStatus } from './payment.enums';
import { Customer } from '../../customers/entities/customer.entity';

export { PaymentMethod, PaymentStatus };

@Entity()
export class Sale {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Stock session this sale belongs to' })
  @ManyToOne(() => StockSession, (session) => session.sales)
  @JoinColumn({ name: 'sessionId' })
  session: StockSession;

  @ApiProperty({ description: 'Session ID', example: 1 })
  @Column()
  sessionId: number;

  @ApiProperty({ description: 'Unique sale number', example: 'SALE-2024-0001' })
  @Column({ unique: true })
  saleNumber: string;

  @ApiProperty({ description: 'Total amount', example: 2000.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, example: PaymentStatus.PAID })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Customer for credit sales', required: false })
  @ManyToOne(() => Customer, { nullable: true, eager: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer | null;

  @ApiProperty({ description: 'Customer ID (required for credit sales)', required: false, example: 1 })
  @Column({ nullable: true })
  customerId: number | null;

  @ApiProperty({ description: 'User who made the sale' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'soldById' })
  soldBy: User;

  @ApiProperty({ description: 'User ID who made the sale', example: 1 })
  @Column()
  soldById: number;

  @ApiProperty({ description: 'When sale was made' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  soldAt: Date;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => SaleItem, (item) => item.sale, { eager: true })
  items: SaleItem[];

  @OneToOne(() => SalePayment, (payment) => payment.sale, { nullable: true })
  payment: SalePayment | null;
}

