import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity()
@Index(['createdAt'])
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class ActivityLog {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'User who performed the action (null for system)' })
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ApiProperty({ description: 'Action identifier', example: 'SESSION_OPENED' })
  @Column()
  action: string;

  @ApiProperty({ description: 'Entity type', example: 'stock_session' })
  @Column()
  entityType: string;

  @ApiProperty({ description: 'Entity ID', required: false })
  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @ApiProperty({ description: 'Additional details (JSON)', required: false })
  @Column('json', { nullable: true })
  details: Record<string, unknown> | null;

  @ApiProperty({ description: 'Whether the action succeeded' })
  @Column({ default: true })
  success: boolean;

  @ApiProperty({ description: 'Error message if failed', required: false })
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
