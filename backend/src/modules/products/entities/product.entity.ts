import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockEntry } from '../../stock-entries/entities/stock-entry.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';

@Entity()
export class Product {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Product name', example: 'Beef' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Unit of measurement', example: 'kg' })
  @Column()
  unit: string;

  @ApiProperty({ description: 'Default price per unit', example: 800.0 })
  @Column('decimal', { precision: 10, scale: 2 })
  defaultPrice: number;

  @ApiProperty({ description: 'Whether product is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => StockEntry, (entry) => entry.product)
  stockEntries: StockEntry[];

  @OneToMany(() => SaleItem, (item) => item.product)
  saleItems: SaleItem[];
}

