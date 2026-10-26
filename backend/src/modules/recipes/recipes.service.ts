import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BranchCatalogScope } from '../../common/enums/branch-catalog-scope.enum';
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
    private readonly dataSource: DataSource,
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
      branchScope: createRecipeDto.branchScope ?? BranchCatalogScope.GENERAL_BUTCHERY,
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

    try {
      return await this.recipeRepository.save(recipe);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`A recipe named "${recipe.name}" already exists`);
      }
      throw error;
    }
  }

  async findAll(activeOnly?: boolean): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
    recipe.ingredients = [...(recipe.ingredients || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    return recipe;
  }

  /**
   * Ingredients are matched by id so that production runs which used them keep
   * their link; ingredients missing from the payload are removed.
   */
  async update(id: number, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findOne(id);
    if (updateRecipeDto.finishedProductId) {
      await this.validateFinishedProduct(updateRecipeDto.finishedProductId);
    }

    const columns: Partial<Recipe> = {
      name: updateRecipeDto.name?.trim() ?? recipe.name,
      branchScope: updateRecipeDto.branchScope ?? recipe.branchScope,
      finishedProductId: updateRecipeDto.finishedProductId ?? recipe.finishedProductId,
      expectedOutputQuantity: updateRecipeDto.expectedOutputQuantity ?? recipe.expectedOutputQuantity,
      outputUnit: updateRecipeDto.outputUnit?.trim() ?? recipe.outputUnit,
      notes:
        updateRecipeDto.notes !== undefined ? updateRecipeDto.notes?.trim() || null : recipe.notes,
      isActive: updateRecipeDto.isActive ?? recipe.isActive,
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Recipe, { id: recipe.id }, columns);

        if (!updateRecipeDto.ingredients) return;
        const existingIds = new Set((recipe.ingredients || []).map((ingredient) => ingredient.id));
        const keptIds = new Set<number>();

        for (const [index, ingredient] of updateRecipeDto.ingredients.entries()) {
          const values = {
            productId: ingredient.productId ?? null,
            ingredientName: ingredient.ingredientName.trim(),
            estimatedQuantity: ingredient.estimatedQuantity,
            unit: ingredient.unit.trim(),
            sortOrder: ingredient.sortOrder ?? index,
          };
          if (ingredient.id && existingIds.has(ingredient.id)) {
            keptIds.add(ingredient.id);
            await manager.update(RecipeIngredient, { id: ingredient.id }, values);
          } else {
            await manager.insert(RecipeIngredient, { ...values, recipeId: recipe.id });
          }
        }

        const removedIds = [...existingIds].filter((ingredientId) => !keptIds.has(ingredientId));
        if (removedIds.length > 0) {
          await manager.delete(RecipeIngredient, { id: In(removedIds) });
        }
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`A recipe named "${columns.name}" already exists`);
      }
      if (error?.code === '23503') {
        throw new BadRequestException('This recipe is linked to past production and cannot be changed that way');
      }
      throw error;
    }

    return this.findOne(recipe.id);
  }

  async remove(id: number): Promise<void> {
    const recipe = await this.findOne(id);
    await this.recipeRepository.remove(recipe);
  }
}
