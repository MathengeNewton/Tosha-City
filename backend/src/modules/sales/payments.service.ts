import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalePayment } from './entities/sale-payment.entity';
import { Sale, PaymentStatus } from './entities/sale.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MpesaChannel, PaymentMethod } from './entities/payment.enums';
import { UserRole } from '../roles/entities/role.entity';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
  branchId?: number | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(SalePayment)
    private paymentRepository: Repository<SalePayment>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private dataSource: DataSource,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
  }

  private assertSaleBranchAccess(sale: Sale, user?: RequestUser): void {
    if (!user) return;
    if (this.isAdmin(user)) return;
    if (!user.branchId || sale.branchId !== user.branchId) {
      throw new ForbiddenException('You cannot access this sale');
    }
  }

  async createPayment(createPaymentDto: CreatePaymentDto, userId: number, user?: RequestUser): Promise<SalePayment> {
    // Find the sale
    const sale = await this.saleRepository.findOne({
      where: { id: createPaymentDto.saleId },
      relations: ['payment'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${createPaymentDto.saleId} not found`);
    }

    this.assertSaleBranchAccess(sale, user);

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

    const { mpesaChannel, reference } = await this.paymentDetails(createPaymentDto);

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
        mpesaChannel,
        reference,
        receivedById: userId,
      });

      const savedPayment = await queryRunner.manager.save(SalePayment, payment);

      // Update only these columns so TypeORM does not touch the payment relation
      // (saving the full Sale entity with payment=null would set payment.saleId to null).
      // Reports group by the sale's method, so it follows how the bill was actually paid;
      // credit sales stay CREDIT so they still show against the customer.
      await queryRunner.manager.update(
        Sale,
        { id: createPaymentDto.saleId },
        sale.paymentMethod === PaymentMethod.CREDIT
          ? { paymentStatus: PaymentStatus.PAID }
          : { paymentStatus: PaymentStatus.PAID, paymentMethod: createPaymentDto.method },
      );

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

  /** M-Pesa needs till or paybill and an unused code; PDQ may carry a slip reference; cash carries nothing. */
  private async paymentDetails(
    dto: CreatePaymentDto,
  ): Promise<{ mpesaChannel: MpesaChannel | null; reference: string | null }> {
    const reference = dto.reference?.trim() || null;
    if (dto.method === PaymentMethod.MPESA) {
      if (!dto.mpesaChannel) {
        throw new BadRequestException('Choose whether the M-Pesa payment came to the till or the paybill');
      }
      if (!reference) {
        throw new BadRequestException('Enter the M-Pesa code');
      }
      const code = reference.toUpperCase();
      const used = await this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.sale', 'sale')
        .where('payment.method = :method', { method: PaymentMethod.MPESA })
        .andWhere('UPPER(payment.reference) = :code', { code })
        .getOne();
      if (used) {
        throw new BadRequestException(
          `M-Pesa code ${code} was already used on sale ${used.sale?.saleNumber || used.saleId}`,
        );
      }
      return { mpesaChannel: dto.mpesaChannel, reference: code };
    }
    if (dto.method === PaymentMethod.PDQ) {
      return { mpesaChannel: null, reference };
    }
    return { mpesaChannel: null, reference: null };
  }

  async findPaymentBySaleId(saleId: number, user?: RequestUser): Promise<SalePayment | null> {
    const sale = await this.saleRepository.findOne({ where: { id: saleId } });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }
    this.assertSaleBranchAccess(sale, user);
    return await this.paymentRepository.findOne({
      where: { saleId },
      relations: ['sale', 'receivedBy'],
    });
  }

  async findAll(
    filters?: { saleId?: number; method?: PaymentMethod; date?: string },
    user?: RequestUser,
  ): Promise<SalePayment[]> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.sale', 'sale')
      .leftJoinAndSelect('payment.receivedBy', 'receivedBy');

    if (user && !this.isAdmin(user)) {
      if (!user.branchId) {
        throw new ForbiddenException('Your account is not assigned to a branch');
      }
      query.where('sale.branchId = :branchId', { branchId: user.branchId });
    }

    if (filters?.saleId) {
      if (user && !this.isAdmin(user)) {
        query.andWhere('payment.saleId = :saleId', { saleId: filters.saleId });
      } else {
        query.where('payment.saleId = :saleId', { saleId: filters.saleId });
      }
    }

    if (filters?.method) {
      query.andWhere('payment.method = :method', { method: filters.method });
    }

    if (filters?.date) {
      query.andWhere('DATE(payment.receivedAt) = :date', { date: filters.date });
    }

    return await query.orderBy('payment.receivedAt', 'DESC').getMany();
  }

  async findOne(id: number, user?: RequestUser): Promise<SalePayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['sale', 'sale.items', 'sale.items.product', 'receivedBy'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.sale) {
      this.assertSaleBranchAccess(payment.sale, user);
    }

    return payment;
  }
}

