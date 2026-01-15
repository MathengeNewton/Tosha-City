import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalePayment } from './entities/sale-payment.entity';
import { Sale, PaymentStatus } from './entities/sale.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod } from './entities/payment.enums';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(SalePayment)
    private paymentRepository: Repository<SalePayment>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private dataSource: DataSource,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto, userId: number): Promise<SalePayment> {
    // Find the sale
    const sale = await this.saleRepository.findOne({
      where: { id: createPaymentDto.saleId },
      relations: ['payment'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${createPaymentDto.saleId} not found`);
    }

    // Check if sale already has payment
    if (sale.payment) {
      throw new BadRequestException('Payment already recorded for this sale');
    }

    // For credit sales, allow partial payments (for future enhancement)
    // For now, validate payment amount matches sale total
    if (sale.paymentMethod !== PaymentMethod.CREDIT) {
      if (Math.abs(createPaymentDto.amount - sale.totalAmount) > 0.01) {
        throw new BadRequestException(
          `Payment amount (${createPaymentDto.amount}) does not match sale total (${sale.totalAmount})`,
        );
      }
    } else {
      // For credit, payment should match or be less (partial payment support in future)
      if (createPaymentDto.amount > sale.totalAmount) {
        throw new BadRequestException(
          `Payment amount (${createPaymentDto.amount}) cannot exceed sale total (${sale.totalAmount})`,
        );
      }
    }

    // Validate MPESA reference if method is MPESA
    if (createPaymentDto.method === PaymentMethod.MPESA && !createPaymentDto.mpesaReference) {
      throw new BadRequestException('MPESA reference is required for MPESA payments');
    }

    // Create payment and update sale status in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create payment
      const payment = queryRunner.manager.create(SalePayment, {
        saleId: createPaymentDto.saleId,
        amount: createPaymentDto.amount,
        method: createPaymentDto.method,
        mpesaReference: createPaymentDto.mpesaReference || null,
        receivedById: userId,
      });

      const savedPayment = await queryRunner.manager.save(SalePayment, payment);

      // Update sale payment status
      sale.paymentStatus = PaymentStatus.PAID;
      await queryRunner.manager.save(Sale, sale);

      await queryRunner.commitTransaction();

      // Return payment with relations
      const paymentWithRelations = await this.paymentRepository.findOne({
        where: { id: savedPayment.id },
        relations: ['sale', 'receivedBy'],
      });

      if (!paymentWithRelations) {
        throw new NotFoundException('Payment was created but could not be retrieved');
      }

      return paymentWithRelations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findPaymentBySaleId(saleId: number): Promise<SalePayment | null> {
    return await this.paymentRepository.findOne({
      where: { saleId },
      relations: ['sale', 'receivedBy'],
    });
  }

  async findAll(filters?: { saleId?: number; method?: PaymentMethod; date?: string }): Promise<SalePayment[]> {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.sale', 'sale')
      .leftJoinAndSelect('payment.receivedBy', 'receivedBy');

    if (filters?.saleId) {
      query.where('payment.saleId = :saleId', { saleId: filters.saleId });
    }

    if (filters?.method) {
      query.andWhere('payment.method = :method', { method: filters.method });
    }

    if (filters?.date) {
      query.andWhere('DATE(payment.receivedAt) = :date', { date: filters.date });
    }

    return await query.orderBy('payment.receivedAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<SalePayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['sale', 'sale.items', 'sale.items.product', 'receivedBy'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }
}

