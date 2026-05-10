import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchCatalogScope } from '../../common/enums/branch-catalog-scope.enum';
import { Branch, BranchType } from '../branches/entities/branch.entity';
import { Product, ProductCategory, ProductSaleMode, ProductSegment } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncSegmentsFromCategories();
  }

  /** Align segment with category for legacy rows and after enum migrations. */
  private async syncSegmentsFromCategories(): Promise<void> {
    try {
      await this.productRepository.query(
        `UPDATE product SET segment = 'MEAT' WHERE category = 'RAW_STOCK'`,
      );
      await this.productRepository.query(
        `UPDATE product SET segment = 'PREPARED' WHERE category = 'PRODUCTION_ITEM'`,
      );
      await this.productRepository.query(
        `UPDATE product SET segment = 'RETAIL' WHERE category = 'CONSUMABLE' AND segment != 'KITCHEN_SUPPLY'`,
      );
    } catch (e) {
      console.warn('Product segment backfill skipped:', (e as Error)?.message);
    }
  }

  private inferSegmentFromCategory(category: ProductCategory): ProductSegment {
    switch (category) {
      case ProductCategory.RAW_STOCK:
        return ProductSegment.MEAT;
      case ProductCategory.PRODUCTION_ITEM:
        return ProductSegment.PREPARED;
      case ProductCategory.CONSUMABLE:
      default:
        return ProductSegment.RETAIL;
    }
  }

  private isValidSegmentForCategory(segment: ProductSegment, category: ProductCategory): boolean {
    return (
      (segment === ProductSegment.MEAT && category === ProductCategory.RAW_STOCK) ||
      (segment === ProductSegment.PREPARED && category === ProductCategory.PRODUCTION_ITEM) ||
      ((segment === ProductSegment.RETAIL || segment === ProductSegment.KITCHEN_SUPPLY) &&
        category === ProductCategory.CONSUMABLE)
    );
  }

  private validateSegmentCategory(segment: ProductSegment, category: ProductCategory): void {
    if (!this.isValidSegmentForCategory(segment, category)) {
      throw new BadRequestException(`Segment "${segment}" is not valid for category "${category}"`);
    }
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    if (createProductDto.defaultPrice === undefined || createProductDto.defaultPrice === null) {
      throw new BadRequestException('defaultPrice is required and must be a number');
    }

    const category = createProductDto.category ?? ProductCategory.RAW_STOCK;
    const saleMode = createProductDto.saleMode ?? ProductSaleMode.WEIGHT;
    const segment = createProductDto.segment ?? this.inferSegmentFromCategory(category);
    this.validateSegmentCategory(segment, category);

    const productData = {
      name: createProductDto.name.trim(),
      unit: createProductDto.unit.trim(),
      defaultPrice: Number(createProductDto.defaultPrice),
      wholesalePrice:
        createProductDto.wholesalePrice !== undefined && createProductDto.wholesalePrice !== null
          ? Number(createProductDto.wholesalePrice)
          : null,
      category,
      saleMode,
      segment,
      salesPrompt: createProductDto.salesPrompt?.trim() || null,
      isActive: createProductDto.isActive !== undefined ? createProductDto.isActive : true,
      parentProductId: createProductDto.parentProductId || null,
      branchScope: createProductDto.branchScope ?? BranchCatalogScope.ALL,
    };

    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      relations: ['parentProduct'],
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true },
      relations: ['parentProduct'],
      order: { name: 'ASC' },
    });
  }

  /** When branchId is null, returns all active products (e.g. admin with no branch). */
  async findActiveForBranch(branchId: number | null): Promise<Product[]> {
    if (branchId == null) {
      return this.findActive();
    }
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }
    const catalogScopeForBranch =
      branch.type === BranchType.GENERAL_BUTCHERY
        ? BranchCatalogScope.GENERAL_BUTCHERY
        : BranchCatalogScope.PORK_BUTCHERY;
    return await this.productRepository.find({
      where: [
        { isActive: true, branchScope: BranchCatalogScope.ALL },
        { isActive: true, branchScope: catalogScopeForBranch },
      ],
      relations: ['parentProduct'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['parentProduct', 'byproducts'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const nextCategory = (updateProductDto.category ?? product.category) as ProductCategory;
    let nextSegment = (updateProductDto.segment ?? product.segment) as ProductSegment;
    if (updateProductDto.category !== undefined && updateProductDto.segment === undefined) {
      nextSegment = this.inferSegmentFromCategory(nextCategory);
    }
    // e.g. category changed to CONSUMABLE but client still sent segment PREPARED — align to category
    if (!this.isValidSegmentForCategory(nextSegment, nextCategory)) {
      nextSegment = this.inferSegmentFromCategory(nextCategory);
    }
    this.validateSegmentCategory(nextSegment, nextCategory);

    Object.assign(product, updateProductDto);
    if (typeof product.salesPrompt === 'string') {
      product.salesPrompt = product.salesPrompt.trim() || null;
    }
    product.category = nextCategory;
    product.segment = nextSegment;
    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
