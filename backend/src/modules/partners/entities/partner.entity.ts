import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Partner {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Partner name', example: 'ABC Butchery' })
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

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Whether partner is active', example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Date created' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Date updated' })
  @UpdateDateColumn()
  updatedAt: Date;
}
