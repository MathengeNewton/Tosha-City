import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Sale } from './sale.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class SaleItem {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Sale this item belongs to' })
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @ApiProperty({ description: 'Sale ID', example: 1 })
  @Column()
  saleId: number;

  @ApiProperty({ description: 'Product for this item' })
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @Column()
  productId: number;

  @ApiProperty({ description: 'Quantity sold', example: 2.5 })
  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit price at time of sale', example: 800.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @ApiProperty({ description: 'Total price for this item', example: 2000.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;
}

