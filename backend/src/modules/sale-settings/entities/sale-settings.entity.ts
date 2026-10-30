import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export const DEFAULT_TABLES = [
  'B1', 'B2', 'B3', 'B4',
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'Shade 1', 'Shade 2', 'Shade 3', 'Shade 4', 'Shade 5', 'Shade 6',
  'Hall 1', 'Hall 2', 'Hall 3', 'Hall 4',
];

/** Single row of till and receipt configuration. */
@Entity('sale_settings')
export class SaleSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Kitchen cooking fee charged per kg of meat', example: 100 })
  @Column('decimal', { precision: 10, scale: 2, default: 100 })
  cookingFeePerKg: number;

  @ApiProperty({ description: 'Table labels offered on the till', example: DEFAULT_TABLES })
  @Column({ type: 'jsonb', nullable: true })
  tables: string[] | null;

  @ApiProperty({ example: 'Nairobi-Nakuru Highway @ Kayole Adams' })
  @Column({ type: 'varchar', nullable: true })
  receiptLocation: string | null;

  @ApiProperty({ example: '0746315595' })
  @Column({ type: 'varchar', nullable: true })
  receiptPhone: string | null;

  @ApiProperty({ description: 'M-Pesa Buy Goods till number', example: '6967914' })
  @Column({ type: 'varchar', nullable: true, default: '6967914' })
  tillNumber: string | null;

  @ApiProperty({ example: '222111' })
  @Column({ type: 'varchar', nullable: true })
  paybillNumber: string | null;

  @ApiProperty({ example: '2783009' })
  @Column({ type: 'varchar', nullable: true })
  paybillAccount: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
