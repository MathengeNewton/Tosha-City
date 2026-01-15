import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerType } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Sale } from '../sales/entities/sale.entity';
import { PaymentStatus } from '../sales/entities/payment.enums';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create(createCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async findAll(activeOnly?: boolean, type?: CustomerType): Promise<Customer[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }
    return await this.customerRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, updateCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async getOutstandingBalance(customerId: number): Promise<number> {
    const customer = await this.findOne(customerId);
    if (customer.type !== CustomerType.CREDIT) {
      return 0;
    }

    const unpaidSales = await this.saleRepository.find({
      where: {
        customerId,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    return unpaidSales.reduce((total, sale) => total + Number(sale.totalAmount), 0);
  }

  async getCreditCustomersWithBalances(): Promise<Array<Customer & { outstandingBalance: number }>> {
    const creditCustomers = await this.findAll(true, CustomerType.CREDIT);
    const customersWithBalances = await Promise.all(
      creditCustomers.map(async (customer) => {
        const balance = await this.getOutstandingBalance(customer.id);
        return { ...customer, outstandingBalance: balance };
      }),
    );
    return customersWithBalances;
  }
}



