import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalePayment } from './entities/sale-payment.entity';
import { Sale, PaymentStatus } from './entities/sale.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto } from './dto/create-split-payment.dto';
import { PaymentLineDto } from './dto/payment-line.dto';
import { PaymentMethod } from './entities/payment.enums';

const TOLERANCE = 0.01;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(SalePayment)
    private paymentRepository: Repository<SalePayment>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private dataSource: DataSource,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto, userId: number): Promise<SalePayment[]> {
    return this.createSplitPayment(
      {
        saleId: createPaymentDto.saleId,
        lines: [
          {
            method: createPaymentDto.method as PaymentMethod.CASH | PaymentMethod.MPESA,
            amount: createPaymentDto.amount,
            mpesaReference: createPaymentDto.mpesaReference,
          },
        ],
      },
      userId,
    );
  }

  async createSplitPayment(dto: CreateSplitPaymentDto, userId: number): Promise<SalePayment[]> {
    const sale = await this.saleRepository.findOne({
      where: { id: dto.saleId },
      relations: ['payments'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${dto.saleId} not found`);
    }

    this.validateLines(dto.lines);

    const existingTotal = this.sumPayments(sale.payments || []);
    const saleTotal = Number(sale.totalAmount);
    const newTotal = this.sumLineAmounts(dto.lines);

    if (existingTotal >= saleTotal - TOLERANCE) {
      throw new BadRequestException('Sale is already fully paid');
    }

    const remaining = saleTotal - existingTotal;

    if (sale.paymentMethod !== PaymentMethod.CREDIT) {
      if (Math.abs(newTotal - remaining) > TOLERANCE) {
        throw new BadRequestException(
          `Payment total (${newTotal}) must equal amount due (${remaining.toFixed(2)})`,
        );
      }
    } else if (newTotal > remaining + TOLERANCE) {
      throw new BadRequestException(
        `Payment total (${newTotal}) cannot exceed amount due (${remaining.toFixed(2)})`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const saved: SalePayment[] = [];
      for (const line of dto.lines) {
        const payment = queryRunner.manager.create(SalePayment, {
          saleId: dto.saleId,
          amount: line.amount,
          method: line.method,
          mpesaReference: line.mpesaReference || null,
          receivedById: userId,
        });
        saved.push(await queryRunner.manager.save(SalePayment, payment));
      }

      const paidTotal = existingTotal + newTotal;
      let paymentStatus = PaymentStatus.PENDING;
      if (paidTotal >= saleTotal - TOLERANCE) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paidTotal > TOLERANCE) {
        paymentStatus = PaymentStatus.PARTIAL;
      }

      const settlementMethods = new Set([
        ...(sale.payments || []).map((p) => p.method),
        ...dto.lines.map((l) => l.method),
      ]);
      let paymentMethod = sale.paymentMethod;
      if (paymentStatus === PaymentStatus.PAID && settlementMethods.size > 1) {
        paymentMethod = PaymentMethod.MIXED;
      } else if (
        paymentStatus === PaymentStatus.PAID &&
        settlementMethods.size === 1 &&
        sale.paymentMethod !== PaymentMethod.CREDIT
      ) {
        paymentMethod = [...settlementMethods][0];
      }

      await queryRunner.manager.update(
        Sale,
        { id: dto.saleId },
        { paymentStatus, paymentMethod },
      );

      await queryRunner.commitTransaction();

      return this.findPaymentsBySaleId(dto.saleId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private validateLines(lines: PaymentLineDto[]): void {
    for (const line of lines) {
      if (line.method !== PaymentMethod.CASH && line.method !== PaymentMethod.MPESA) {
        throw new BadRequestException('Settlement lines must be CASH or MPESA');
      }
      if (line.method === PaymentMethod.MPESA && !line.mpesaReference?.trim()) {
        throw new BadRequestException('MPESA reference is required for MPESA payments');
      }
    }
  }

  private sumPayments(payments: SalePayment[]): number {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  private sumLineAmounts(lines: PaymentLineDto[]): number {
    return lines.reduce((sum, l) => sum + Number(l.amount), 0);
  }

  async findPaymentsBySaleId(saleId: number): Promise<SalePayment[]> {
    return this.paymentRepository.find({
      where: { saleId },
      relations: ['sale', 'receivedBy'],
      order: { receivedAt: 'ASC', id: 'ASC' },
    });
  }

  /** @deprecated Use findPaymentsBySaleId */
  async findPaymentBySaleId(saleId: number): Promise<SalePayment | null> {
    const payments = await this.findPaymentsBySaleId(saleId);
    return payments[0] ?? null;
  }

  async findAll(filters?: { saleId?: number; method?: PaymentMethod; date?: string }): Promise<SalePayment[]> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
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

    return query.orderBy('payment.receivedAt', 'DESC').getMany();
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
