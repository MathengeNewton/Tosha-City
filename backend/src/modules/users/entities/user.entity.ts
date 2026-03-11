import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Branch } from '../../branches/entities/branch.entity';

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

  @ApiProperty({ description: 'Assigned branch', required: false, type: () => Branch })
  @ManyToOne(() => Branch, (branch) => branch.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch | null;

  @ApiProperty({ description: 'Assigned branch ID', example: 1, required: false })
  @Column({ nullable: true })
  branchId: number | null;
}
