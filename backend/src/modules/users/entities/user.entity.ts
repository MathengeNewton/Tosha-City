import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Username', example: 'username' })
  @Column({ unique: true })
  username: string;

  @ApiProperty({ description: 'Email', example: 'email', required: false })
  @Column({ unique: true, nullable: true })
  email: string;

  @ApiProperty({ description: 'Password', example: 'password' })
  @Column()
  password: string;

  @ApiProperty({ description: 'Roles', example: 'admin' })
  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable()
  roles: Role[];
}
