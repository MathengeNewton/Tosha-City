import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductCategory, ProductSaleMode, ProductSegment } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncSegmentsFromCategories();
    await this.backfillProductionCategories();
  }

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

  private inferSaleMode(category: ProductCategory, saleMode?: ProductSaleMode): ProductSaleMode {
    if (saleMode) return saleMode;
    if (category === ProductCategory.PRODUCTION_ITEM) return ProductSaleMode.UNIT;
    if (category === ProductCategory.RAW_STOCK) return ProductSaleMode.WEIGHT;
    return ProductSaleMode.UNIT;
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
    const saleMode = this.inferSaleMode(category, createProductDto.saleMode);
    const segment = createProductDto.segment ?? this.inferSegmentFromCategory(category);
    this.validateSegmentCategory(segment, category);

    const parentProductId =
      category === ProductCategory.PRODUCTION_ITEM
        ? null
        : createProductDto.parentProductId || null;

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
      parentProductId,
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

  /** Finished goods for recipes (production category, PREPARED segment, or per-piece legacy rows). */
  async findProductionItems(activeOnly = true): Promise<Product[]> {
    const pieceUnits = ['piece', 'pieces', 'portion', 'portions', 'serving', 'servings', 'plate', 'plates'];
    const qb = this.productRepository
      .createQueryBuilder('product')
      .where(
        `(product.category = :production OR product.segment = :prepared OR (
          product."saleMode" = :unitMode AND LOWER(TRIM(product.unit)) IN (:...pieceUnits)
        ))`,
        {
          production: ProductCategory.PRODUCTION_ITEM,
          prepared: ProductSegment.PREPARED,
          unitMode: ProductSaleMode.UNIT,
          pieceUnits,
        },
      )
      .orderBy('product.name', 'ASC');

    if (activeOnly) {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    return qb.getMany();
  }

  private async backfillProductionCategories(): Promise<void> {
    try {
      const pieceUnits = ['piece', 'pieces', 'portion', 'portions', 'serving', 'servings', 'plate', 'plates'];
      const fromSegment = await this.productRepository
        .createQueryBuilder()
        .update(Product)
        .set({
          category: ProductCategory.PRODUCTION_ITEM,
          saleMode: ProductSaleMode.UNIT,
        })
        .where('segment = :prepared', { prepared: ProductSegment.PREPARED })
        .andWhere('category != :production', { production: ProductCategory.PRODUCTION_ITEM })
        .execute();

      const fromPieceUnit = await this.productRepository
        .createQueryBuilder()
        .update(Product)
        .set({
          category: ProductCategory.PRODUCTION_ITEM,
          segment: ProductSegment.PREPARED,
          saleMode: ProductSaleMode.UNIT,
        })
        .where('category = :raw', { raw: ProductCategory.RAW_STOCK })
        .andWhere('LOWER(TRIM(unit)) IN (:...pieceUnits)', { pieceUnits })
        .execute();

      const total = (fromSegment.affected ?? 0) + (fromPieceUnit.affected ?? 0);
      if (total > 0) {
        console.log(`Backfilled ${total} product(s) to PRODUCTION_ITEM`);
      }
    } catch (e) {
      console.warn('Production category backfill skipped:', (e as Error)?.message);
    }
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
    product.saleMode = this.inferSaleMode(
      nextCategory,
      (updateProductDto.saleMode ?? product.saleMode) as ProductSaleMode,
    );
    if (nextCategory === ProductCategory.PRODUCTION_ITEM) {
      product.parentProductId = null;
    }
    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
