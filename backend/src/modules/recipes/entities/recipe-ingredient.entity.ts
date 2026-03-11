import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Recipe } from './recipe.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class RecipeIngredient {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe: Recipe;

  @Column()
  recipeId: number;

  @ApiProperty({ description: 'Optional linked stock product', required: false, example: 1 })
  @ManyToOne(() => Product, { nullable: true, eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @ApiProperty({ required: false, example: 1 })
  @Column({ nullable: true })
  productId: number | null;

  @ApiProperty({ description: 'Ingredient display name', example: 'Salt' })
  @Column()
  ingredientName: string;

  @ApiProperty({ description: 'Estimated quantity used', example: 2.5 })
  @Column('decimal', { precision: 10, scale: 2 })
  estimatedQuantity: number;

  @ApiProperty({ description: 'Ingredient unit', example: 'kg' })
  @Column()
  unit: string;

  @ApiProperty({ description: 'Display order', example: 1, required: false })
  @Column({ default: 0 })
  sortOrder: number;
}
