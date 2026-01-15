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

@Entity()
export class Supplier {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Supplier name', example: 'ABC Meat Suppliers' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Contact person name', required: false })
  @Column({ type: 'varchar', nullable: true })
  contactPerson: string | null;

  @ApiProperty({ description: 'Phone number', required: false })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Email address', required: false })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @ApiProperty({ description: 'Physical address', required: false })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Whether supplier is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => StockEntry, (entry) => entry.supplier)
  stockEntries: StockEntry[];
}

