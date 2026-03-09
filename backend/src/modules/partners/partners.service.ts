import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async create(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    const partner = this.partnerRepository.create(createPartnerDto);
    return await this.partnerRepository.save(partner);
  }

  async findAll(activeOnly?: boolean): Promise<Partner[]> {
    if (activeOnly) {
      return await this.partnerRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    }
    return await this.partnerRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async update(id: number, updatePartnerDto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);
    Object.assign(partner, updatePartnerDto);
    return await this.partnerRepository.save(partner);
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findOne(id);
    await this.partnerRepository.remove(partner);
  }
}
