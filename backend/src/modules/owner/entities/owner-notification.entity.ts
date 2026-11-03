import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** One row per push already sent, so the same summary or warning is never sent twice. */
@Entity('owner_notification')
export class OwnerNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  sentAt: Date;
}
