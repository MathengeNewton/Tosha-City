import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Sale } from './sale.entity';
import { PaymentMethod } from './payment.enums';
import { User } from '../../users/entities/user.entity';

@Entity('sale_payments')
export class SalePayment {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Sale this payment is for' })
  @OneToOne(() => Sale, (sale) => sale.payment)
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @ApiProperty({ description: 'Sale ID (unique)', example: 1 })
  @Column({ unique: true })
  saleId: number;

  @ApiProperty({ description: 'Payment amount', example: 2000.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @ApiProperty({ description: 'MPESA reference (if payment method is MPESA)', required: false })
  @Column({ type: 'varchar', nullable: true })
  mpesaReference: string | null;

  @ApiProperty({ description: 'User who received the payment' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'receivedById' })
  receivedBy: User;

  @ApiProperty({ description: 'User ID who received the payment', example: 1 })
  @Column()
  receivedById: number;

  @ApiProperty({ description: 'When payment was received' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;
}

