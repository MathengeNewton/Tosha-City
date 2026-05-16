import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { Sale } from '../../sales/entities/sale.entity';

export enum BranchType {
  GENERAL_BUTCHERY = 'GENERAL_BUTCHERY',
  PORK_BUTCHERY = 'PORK_BUTCHERY',
}

@Entity()
export class Branch {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Branch name', example: 'Tosha City Main Butchery' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Short branch code', example: 'MAIN' })
  @Column({ unique: true })
  code: string;

  @ApiProperty({ description: 'Branch type', enum: BranchType })
  @Column({
    type: 'enum',
    enum: BranchType,
    default: BranchType.GENERAL_BUTCHERY,
  })
  type: BranchType;

  @ApiProperty({ description: 'Whether branch is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @OneToMany(() => StockSession, (session) => session.branch)
  stockSessions: StockSession[];

  @OneToMany(() => Sale, (sale) => sale.branch)
  sales: Sale[];
}
