import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { StockEntry } from '../../stock-entries/entities/stock-entry.entity';
import { Sale } from '../../sales/entities/sale.entity';

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity()
export class StockSession {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Session date', example: '2024-01-15' })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({ description: 'User who opened the session' })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'openedById' })
  openedBy: User;

  @ApiProperty({ description: 'User ID who opened the session', example: 1 })
  @Column()
  openedById: number;

  @ApiProperty({ description: 'When session was opened' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @ApiProperty({ description: 'When session was closed', required: false })
  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @ApiProperty({ description: 'Session status', enum: SessionStatus, example: SessionStatus.OPEN })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.OPEN,
  })
  status: SessionStatus;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => StockEntry, (entry) => entry.session)
  stockEntries: StockEntry[];

  @OneToMany(() => Sale, (sale) => sale.session)
  sales: Sale[];
}

