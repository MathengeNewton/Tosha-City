import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Partner } from '../../partners/entities/partner.entity';
import { Product } from '../../products/entities/product.entity';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class StockShare {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Partner this share is for' })
  @ManyToOne(() => Partner, { eager: true })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column()
  partnerId: number;

  @ApiProperty({ description: 'Product shared' })
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: number;

  @ApiProperty({ description: 'Stock session (optional)', required: false })
  @ManyToOne(() => StockSession, { nullable: true, eager: true })
  @JoinColumn({ name: 'sessionId' })
  session: StockSession | null;

  @ApiProperty({ description: 'Session ID', required: false })
  @Column({ nullable: true })
  sessionId: number | null;

  @ApiProperty({ description: 'Quantity shared', example: 50.5 })
  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit', example: 'kg' })
  @Column()
  unit: string;

  @ApiProperty({ description: 'Whether partner has paid for this share', example: false })
  @Column({ default: false })
  paid: boolean;

  @ApiProperty({ description: 'When payment was recorded', required: false })
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ description: 'Notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'User who recorded this share' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @Column()
  recordedById: number;

  @ApiProperty({ description: 'When share was recorded' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
