import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockSession } from '../../stock-sessions/entities/stock-session.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { ProductionRunIngredient } from './production-run-ingredient.entity';

@Entity()
export class ProductionRun {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockSession, { eager: true })
  @JoinColumn({ name: 'sessionId' })
  session: StockSession;

  @Column()
  sessionId: number;

  @ManyToOne(() => Recipe, { eager: true })
  @JoinColumn({ name: 'recipeId' })
  recipe: Recipe;

  @Column()
  recipeId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'finishedProductId' })
  finishedProduct: Product;

  @Column()
  finishedProductId: number;

  @ApiProperty({ example: 40 })
  @Column('decimal', { precision: 10, scale: 2 })
  expectedOutputQuantity: number;

  @ApiProperty({ example: 38 })
  @Column('decimal', { precision: 10, scale: 2 })
  actualOutputQuantity: number;

  @ApiProperty({ example: 2, required: false })
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  wastedQuantity: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy: User;

  @Column()
  recordedById: number;

  @CreateDateColumn()
  recordedAt: Date;

  @OneToMany(() => ProductionRunIngredient, (ingredient) => ingredient.productionRun, {
    cascade: true,
    eager: true,
  })
  ingredients: ProductionRunIngredient[];
}
