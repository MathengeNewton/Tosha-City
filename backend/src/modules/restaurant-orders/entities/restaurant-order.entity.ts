import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Branch } from '../../branches/entities/branch.entity';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { User } from '../../users/entities/user.entity';
import { RestaurantOrderLine } from './restaurant-order-line.entity';

export enum RestaurantServiceType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
}

export enum RestaurantOrderStatus {
  OPEN = 'OPEN',
  BILLED = 'BILLED',
  VOID = 'VOID',
}

@Entity()
export class RestaurantOrder {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => Branch, { eager: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  branchId: number;

  @ManyToOne(() => StockSession, { eager: true })
  @JoinColumn({ name: 'sessionId' })
  session: StockSession;

  @Column()
  sessionId: number;

  @Column({
    type: 'enum',
    enum: RestaurantServiceType,
    default: RestaurantServiceType.DINE_IN,
  })
  serviceType: RestaurantServiceType;

  @Column({ type: 'varchar', nullable: true })
  tableLabel: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assignedStaffId' })
  assignedStaff: User | null;

  @Column({ nullable: true })
  assignedStaffId: number | null;

  @Column({
    type: 'enum',
    enum: RestaurantOrderStatus,
    default: RestaurantOrderStatus.OPEN,
  })
  status: RestaurantOrderStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RestaurantOrderLine, (line) => line.order, { cascade: true, eager: true })
  lines: RestaurantOrderLine[];
}
