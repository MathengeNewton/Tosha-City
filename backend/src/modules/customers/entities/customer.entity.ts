import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Sale } from '../../sales/entities/sale.entity';

export enum CustomerType {
  REGULAR = 'REGULAR',
  CREDIT = 'CREDIT',
}

@Entity()
export class Customer {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Email address', required: false })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @ApiProperty({ description: 'Physical address', required: false })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiProperty({ description: 'Customer type', enum: CustomerType, example: CustomerType.REGULAR })
  @Column({
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.REGULAR,
  })
  type: CustomerType;

  @ApiProperty({ description: 'Credit limit (for credit customers)', required: false })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  creditLimit: number | null;

  @ApiProperty({ description: 'Payment terms (e.g., "Net 30")', required: false })
  @Column({ type: 'varchar', nullable: true })
  paymentTerms: string | null;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Whether customer is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Sale, (sale) => sale.customer)
  sales: Sale[];
}

