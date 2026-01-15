import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}

export enum UserRole {
  ADMIN = 'admin',
  CASHIER = 'cashier',
  FIELD_AGENT = 'field_agent',
  STAFF = 'staff',
  VET = 'vet',
  PARTNER = 'partner',
  APP = 'app',
  GUEST = 'guest',
  OWNER = 'owner',
}
