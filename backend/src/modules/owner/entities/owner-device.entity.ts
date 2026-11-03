import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

/** A phone running the owner app that should receive push notifications. */
@Entity('owner_device')
export class OwnerDevice {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Expo push token', example: 'ExponentPushToken[xxxxxxxx]' })
  @Column({ unique: true })
  expoPushToken: string;

  @ApiProperty({ example: 'android' })
  @Column({ type: 'varchar', default: 'android' })
  platform: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
