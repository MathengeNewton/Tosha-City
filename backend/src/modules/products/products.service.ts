import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    console.log('Creating product with DTO:', JSON.stringify(createProductDto, null, 2));
    
    // Ensure defaultPrice is a valid number
    if (createProductDto.defaultPrice === undefined || createProductDto.defaultPrice === null) {
      throw new Error('defaultPrice is required and must be a number');
    }
    
    const productData = {
      name: createProductDto.name.trim(),
      unit: createProductDto.unit.trim(),
      defaultPrice: Number(createProductDto.defaultPrice),
      isActive: createProductDto.isActive !== undefined ? createProductDto.isActive : true,
    };
    
    console.log('Product data to create:', JSON.stringify(productData, null, 2));
    
    const product = this.productRepository.create(productData);
    console.log('Product entity before save:', JSON.stringify(product, null, 2));
    
    const saved = await this.productRepository.save(product);
    console.log('Product saved successfully:', saved.id);
    return saved;
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findActive(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}

