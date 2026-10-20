import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Customer } from './customer.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
@Unique(['customerId', 'productId'])
export class CustomerProductPrice {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ApiProperty({ description: 'Customer ID', example: 1 })
  @Column()
  customerId: number;

  @ApiProperty({ description: 'Product this special price applies to' })
  @ManyToOne(() => Product, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @Column()
  productId: number;

  @ApiProperty({ description: 'Special wholesale price per unit for this customer', example: 520.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
