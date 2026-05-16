import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { Product, ProductCategory } from '../products/entities/product.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepository: Repository<RecipeIngredient>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private async validateFinishedProduct(productId: number) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Finished product not found');
    }
    if (product.category !== ProductCategory.PRODUCTION_ITEM) {
      throw new BadRequestException('Finished product must be a production item');
    }
    return product;
  }

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    await this.validateFinishedProduct(createRecipeDto.finishedProductId);

    const recipe = this.recipeRepository.create({
      name: createRecipeDto.name.trim(),
      finishedProductId: createRecipeDto.finishedProductId,
      expectedOutputQuantity: createRecipeDto.expectedOutputQuantity,
      outputUnit: createRecipeDto.outputUnit.trim(),
      notes: createRecipeDto.notes?.trim() || null,
      isActive: createRecipeDto.isActive !== false,
      ingredients: (createRecipeDto.ingredients || []).map((ingredient, index) =>
        this.ingredientRepository.create({
          productId: ingredient.productId ?? null,
          ingredientName: ingredient.ingredientName.trim(),
          estimatedQuantity: ingredient.estimatedQuantity,
          unit: ingredient.unit.trim(),
          sortOrder: ingredient.sortOrder ?? index,
        }),
      ),
    });

    return this.recipeRepository.save(recipe);
  }

  async findAll(activeOnly?: boolean): Promise<Recipe[]> {
    const recipes = await this.recipeRepository.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
    for (const recipe of recipes) {
      recipe.ingredients = [...(recipe.ingredients || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return recipes;
  }

  async findOne(id: number): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
    recipe.ingredients = [...(recipe.ingredients || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    return recipe;
  }

  async update(id: number, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findOne(id);
    if (updateRecipeDto.finishedProductId) {
      await this.validateFinishedProduct(updateRecipeDto.finishedProductId);
    }

    Object.assign(recipe, {
      ...updateRecipeDto,
      name: updateRecipeDto.name?.trim() ?? recipe.name,
      outputUnit: updateRecipeDto.outputUnit?.trim() ?? recipe.outputUnit,
      notes:
        updateRecipeDto.notes !== undefined
          ? updateRecipeDto.notes?.trim() || null
          : recipe.notes,
    });

    if (updateRecipeDto.ingredients) {
      await this.ingredientRepository.delete({ recipeId: recipe.id });
      recipe.ingredients = updateRecipeDto.ingredients.map((ingredient, index) =>
        this.ingredientRepository.create({
          recipeId: recipe.id,
          productId: ingredient.productId ?? null,
          ingredientName: ingredient.ingredientName.trim(),
          estimatedQuantity: ingredient.estimatedQuantity,
          unit: ingredient.unit.trim(),
          sortOrder: ingredient.sortOrder ?? index,
        }),
      );
    }

    return this.recipeRepository.save(recipe);
  }

  async remove(id: number): Promise<void> {
    const recipe = await this.findOne(id);
    await this.recipeRepository.remove(recipe);
  }
}
