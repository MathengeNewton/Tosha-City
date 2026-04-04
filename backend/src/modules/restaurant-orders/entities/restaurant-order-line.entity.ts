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
import { Product } from '../../products/entities/product.entity';
import { RestaurantOrder } from './restaurant-order.entity';

export enum RestaurantOrderLineStatus {
  QUEUED = 'QUEUED',
  COOKING = 'COOKING',
  READY = 'READY',
  SERVED = 'SERVED',
}

@Entity()
export class RestaurantOrderLine {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RestaurantOrder, (order) => order.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: RestaurantOrder;

  @Column()
  orderId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: RestaurantOrderLineStatus,
    default: RestaurantOrderLineStatus.QUEUED,
  })
  status: RestaurantOrderLineStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
