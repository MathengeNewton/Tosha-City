import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

export enum StockEntryType {
  OPENING = 'OPENING',
  INCOMING = 'INCOMING',
  CLOSING = 'CLOSING',
  WASTAGE = 'WASTAGE',
}

@Entity()
export class StockEntry {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Stock session this entry belongs to' })
  @ManyToOne(() => StockSession, (session) => session.stockEntries)
  @JoinColumn({ name: 'sessionId' })
  session: StockSession;

  @ApiProperty({ description: 'Session ID', example: 1 })
  @Column()
  sessionId: number;

  @ApiProperty({ description: 'Product for this entry' })
  @ManyToOne(() => Product, (product) => product.stockEntries, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @Column()
  productId: number;

  @ApiProperty({ description: 'Supplier for this entry (for incoming stock)', required: false })
  @ManyToOne(() => Supplier, { nullable: true, eager: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier | null;

  @ApiProperty({ description: 'Supplier ID (for incoming stock)', required: false, example: 1 })
  @Column({ nullable: true })
  supplierId: number | null;

  @ApiProperty({ description: 'Type of stock entry', enum: StockEntryType, example: StockEntryType.OPENING })
  @Column({
    type: 'enum',
    enum: StockEntryType,
  })
  type: StockEntryType;

  @ApiProperty({ description: 'Quantity', example: 50.5 })
  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement', example: 'kg' })
  @Column()
  unit: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Photo URL for wastage evidence', required: false })
  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @ApiProperty({ description: 'User who recorded this entry' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @ApiProperty({ description: 'User ID who recorded this entry', example: 1 })
  @Column()
  recordedById: number;

  @ApiProperty({ description: 'When this entry was recorded' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;
}

