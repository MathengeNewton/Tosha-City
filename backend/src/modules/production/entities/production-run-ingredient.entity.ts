import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ProductionRun } from './production-run.entity';
import { Product } from '../../products/entities/product.entity';
import { RecipeIngredient } from '../../recipes/entities/recipe-ingredient.entity';

@Entity()
export class ProductionRunIngredient {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProductionRun, (productionRun) => productionRun.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productionRunId' })
  productionRun: ProductionRun;

  @Column()
  productionRunId: number;

  @ManyToOne(() => RecipeIngredient, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipeIngredientId' })
  recipeIngredient: RecipeIngredient | null;

  @Column({ nullable: true })
  recipeIngredientId: number | null;

  @ManyToOne(() => Product, { nullable: true, eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ nullable: true })
  productId: number | null;

  @ApiProperty({ example: 'Salt' })
  @Column()
  ingredientName: string;

  @ApiProperty({ example: 2 })
  @Column('decimal', { precision: 10, scale: 2 })
  estimatedQuantity: number;

  @ApiProperty({ example: 2.2 })
  @Column('decimal', { precision: 10, scale: 2 })
  actualQuantity: number;

  @ApiProperty({ example: 'kg' })
  @Column()
  unit: string;
}
