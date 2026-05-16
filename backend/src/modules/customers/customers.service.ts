import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerType } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Sale } from '../sales/entities/sale.entity';
import { PaymentMethod, PaymentStatus } from '../sales/entities/payment.enums';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
  ) {}
  /** Wholesale vs regular is the category; credit is an optional add-on for either. */
  private applyCustomerFlags(dto: { type?: CustomerType; isWholesale?: boolean; creditEnabled?: boolean }) {
    if (dto.type === CustomerType.WHOLESALE) {
      dto.isWholesale = true;
    } else if (dto.type === CustomerType.CREDIT) {
      dto.creditEnabled = true;
    }

    dto.isWholesale = !!dto.isWholesale;
    dto.creditEnabled = !!dto.creditEnabled;
    dto.type = dto.isWholesale ? CustomerType.WHOLESALE : CustomerType.REGULAR;
  }

  customerHasCredit(customer: Customer): boolean {
    return customer.creditEnabled || customer.type === CustomerType.CREDIT;
  }

  customerIsWholesale(customer: Customer): boolean {
    return customer.isWholesale || customer.type === CustomerType.WHOLESALE;
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    this.applyCustomerFlags(createCustomerDto);
    const customer = this.customerRepository.create(createCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async findAll(
    activeOnly?: boolean,
    type?: CustomerType,
    isWholesale?: boolean,
    creditEnabled?: boolean,
  ): Promise<Customer[]> {
    const qb = this.customerRepository.createQueryBuilder('customer').orderBy('customer.name', 'ASC');
    if (activeOnly) {
      qb.andWhere('customer.isActive = :active', { active: true });
    }
    if (type) {
      qb.andWhere('customer.type = :type', { type });
    }
    if (isWholesale === true) {
      qb.andWhere('(customer.isWholesale = true OR customer.type = :ws)', { ws: CustomerType.WHOLESALE });
    } else if (isWholesale === false) {
      qb.andWhere('NOT (customer.isWholesale = true OR customer.type = :ws)', { ws: CustomerType.WHOLESALE });
    }
    if (creditEnabled === true) {
      qb.andWhere('(customer.creditEnabled = true OR customer.type = :cr)', { cr: CustomerType.CREDIT });
    }
    return qb.getMany();
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
    this.applyCustomerFlags(updateCustomerDto);
    Object.assign(customer, updateCustomerDto);
    return await this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async getOutstandingBalance(customerId: number): Promise<number> {
    const customer = await this.findOne(customerId);
    if (!this.customerHasCredit(customer)) {
      return 0;
    }

    const unpaidSales = await this.saleRepository.find({
      where: {
        customerId,
        paymentMethod: PaymentMethod.CREDIT,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    return unpaidSales.reduce((total, sale) => total + Number(sale.totalAmount), 0);
  }

  async getBalanceSummary(customerId: number): Promise<{
    outstandingBalance: number;
    creditLimit: number | null;
    availableCredit: number | null;
  }> {
    const customer = await this.findOne(customerId);
    const outstandingBalance = await this.getOutstandingBalance(customerId);
    const limit = customer.creditLimit != null ? Number(customer.creditLimit) : null;
    const availableCredit =
      limit != null ? Math.max(0, limit - outstandingBalance) : null;
    return { outstandingBalance, creditLimit: limit, availableCredit };
  }

  async getCreditCustomersWithBalances(): Promise<Array<Customer & { outstandingBalance: number }>> {
    const creditCustomers = await this.findAll(true, undefined, undefined, true);
    const customersWithBalances = await Promise.all(
      creditCustomers.map(async (customer) => {
        const balance = await this.getOutstandingBalance(customer.id);
        return { ...customer, outstandingBalance: balance };
      }),
    );
    return customersWithBalances;
  }
}



