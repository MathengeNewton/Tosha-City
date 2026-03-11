import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchRepository.create({
      ...createBranchDto,
      code: createBranchDto.code.trim().toUpperCase(),
      name: createBranchDto.name.trim(),
    });
    return this.branchRepository.save(branch);
  }

  async findAll(activeOnly?: boolean): Promise<Branch[]> {
    return this.branchRepository.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, updateBranchDto);
    if (typeof branch.name === 'string') {
      branch.name = branch.name.trim();
    }
    if (typeof branch.code === 'string') {
      branch.code = branch.code.trim().toUpperCase();
    }
    return this.branchRepository.save(branch);
  }

  async remove(id: number): Promise<void> {
    const branch = await this.findOne(id);
    await this.branchRepository.remove(branch);
  }
}
