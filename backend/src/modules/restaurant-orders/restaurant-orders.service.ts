import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantServiceType,
} from './entities/restaurant-order.entity';
import {
  RestaurantOrderLine,
  RestaurantOrderLineStatus,
} from './entities/restaurant-order-line.entity';
import { Branch, BranchType } from '../branches/entities/branch.entity';
import { StockSessionsService } from '../stock-sessions/stock-sessions.service';
import { SessionStatus } from '../stock-sessions/entities/stock-session.entity';
import { ProductsService } from '../products/products.service';
import { ProductCategory } from '../products/entities/product.entity';
import { SalesService } from '../sales/sales.service';
import { PaymentsService } from '../sales/payments.service';
import { Sale } from '../sales/entities/sale.entity';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateLineStatusDto } from './dto/update-line-status.dto';
import { BillRestaurantOrderDto } from './dto/bill-restaurant-order.dto';
import { UpdateRestaurantOrderDto } from './dto/update-restaurant-order.dto';
import { AddRestaurantOrderLinesDto } from './dto/add-restaurant-order-lines.dto';
import { UpdateRestaurantOrderLineDto } from './dto/update-restaurant-order-line.dto';
import { RecordRestaurantOrderPaymentDto } from './dto/record-restaurant-order-payment.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../roles/entities/role.entity';
import { PaymentMethod } from '../sales/entities/payment.enums';

type RequestUser = {
  userId: number;
  roles?: Array<{ name?: string } | string>;
  branchId?: number | null;
};

@Injectable()
export class RestaurantOrdersService {
  constructor(
    @InjectRepository(RestaurantOrder)
    private orderRepository: Repository<RestaurantOrder>,
    @InjectRepository(RestaurantOrderLine)
    private lineRepository: Repository<RestaurantOrderLine>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private stockSessionsService: StockSessionsService,
    private productsService: ProductsService,
    private salesService: SalesService,
    private paymentsService: PaymentsService,
    private usersService: UsersService,
  ) {}

  private isAdmin(user?: RequestUser): boolean {
    return (user?.roles || []).some((role) =>
      typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
    );
  }

  private async assertBranchAccess(order: RestaurantOrder, user?: RequestUser): Promise<void> {
    if (!user) return;
    if (this.isAdmin(user)) return;
    if (!user.branchId || order.branchId !== user.branchId) {
      throw new ForbiddenException('You cannot access this restaurant order');
    }
  }

  private async assertPorkBranch(branchId: number): Promise<void> {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch || branch.type !== BranchType.PORK_BUTCHERY) {
      throw new BadRequestException('Restaurant orders are only available for pork butchery branches');
    }
  }

  async getStaffOptions(
    user: RequestUser,
    branchIdParam?: number,
  ): Promise<Array<{ id: number; username: string; email: string | null }>> {
    let branchId: number;
    if (this.isAdmin(user)) {
      if (!branchIdParam) {
        throw new BadRequestException('branchId is required');
      }
      branchId = branchIdParam;
    } else {
      if (!user.branchId) {
        throw new BadRequestException('Your account is not assigned to a branch');
      }
      if (branchIdParam && branchIdParam !== user.branchId) {
        throw new ForbiddenException('Invalid branch');
      }
      branchId = user.branchId;
    }
    await this.assertPorkBranch(branchId);
    return this.usersService.findStaffByBranch(branchId);
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORDER-${year}-`;
    const result = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.orderNumber', 'orderNumber')
      .where('o.orderNumber LIKE :pattern', { pattern: `${prefix}%` })
      .orderBy('o.orderNumber', 'DESC')
      .limit(1)
      .getRawOne();
    let next = 1;
    if (result?.orderNumber) {
      const seq = result.orderNumber.replace(prefix, '');
      const n = parseInt(seq, 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  async create(dto: CreateRestaurantOrderDto, user: RequestUser): Promise<RestaurantOrder> {
    const session = await this.stockSessionsService.findOne(dto.sessionId);
    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException('Session is not open');
    }
    if (!this.isAdmin(user)) {
      if (!user.branchId || session.branchId !== user.branchId) {
        throw new ForbiddenException('You can only create orders for your branch session');
      }
    }

    await this.assertPorkBranch(session.branchId);

    if (!dto.lines?.length) {
      throw new BadRequestException('Order must have at least one line');
    }

    const orderNumber = await this.generateOrderNumber();

    const order = this.orderRepository.create({
      orderNumber,
      branchId: session.branchId,
      sessionId: session.id,
      serviceType: dto.serviceType ?? RestaurantServiceType.DINE_IN,
      tableLabel: dto.tableLabel ?? null,
      status: RestaurantOrderStatus.OPEN,
      createdById: user.userId,
    });
    const saved = await this.orderRepository.save(order);

    for (const line of dto.lines) {
      const product = await this.productsService.findOne(line.productId);
      const unitPrice = line.unitPrice ?? Number(product.defaultPrice);
      await this.lineRepository.save(
        this.lineRepository.create({
          orderId: saved.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice,
          notes: line.notes ?? null,
          status: RestaurantOrderLineStatus.QUEUED,
        }),
      );
    }

    return (await this.findOne(saved.id, user)) as RestaurantOrder;
  }

  async findAll(
    user: RequestUser,
    filters?: {
      sessionId?: number;
      status?: RestaurantOrderStatus;
      branchId?: number;
      /** active = OPEN only; closed = BILLED + VOID; all = no status filter */
      list?: 'active' | 'closed' | 'all';
    },
  ): Promise<RestaurantOrder[]> {
    let branchId: number | undefined;
    if (this.isAdmin(user)) {
      branchId = filters?.branchId;
    } else {
      if (!user.branchId) {
        throw new BadRequestException('Your account is not assigned to a branch');
      }
      if (filters?.branchId && filters.branchId !== user.branchId) {
        throw new ForbiddenException('Invalid branch filter');
      }
      branchId = user.branchId;
    }

    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.lines', 'lines')
      .leftJoinAndSelect('lines.product', 'product')
      .leftJoinAndSelect('o.createdBy', 'createdBy')
      .leftJoinAndSelect('o.assignedStaff', 'assignedStaff')
      .leftJoinAndSelect('o.session', 'session')
      .orderBy('o.createdAt', 'DESC');

    if (branchId) {
      qb.andWhere('o.branchId = :branchId', { branchId });
    }
    if (filters?.sessionId) {
      qb.andWhere('o.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    if (filters?.list === 'active') {
      qb.andWhere('o.status = :stOpen', { stOpen: RestaurantOrderStatus.OPEN });
    } else if (filters?.list === 'closed') {
      qb.andWhere('o.status IN (:...stClosed)', {
        stClosed: [RestaurantOrderStatus.BILLED, RestaurantOrderStatus.VOID],
      });
    } else if (filters?.status) {
      qb.andWhere('o.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async findOne(id: number, user?: RequestUser): Promise<RestaurantOrder & { linkedSale?: Sale | null }> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['lines', 'lines.product', 'createdBy', 'assignedStaff', 'session', 'branch'],
    });
    if (!order) {
      throw new NotFoundException(`Restaurant order ${id} not found`);
    }
    await this.assertBranchAccess(order, user);

    let linkedSale: Sale | null = null;
    if (order.status === RestaurantOrderStatus.BILLED) {
      linkedSale = await this.saleRepository.findOne({
        where: { restaurantOrderId: order.id },
        relations: ['payment', 'items', 'items.product'],
      });
    }
    (order as RestaurantOrder & { linkedSale?: Sale | null }).linkedSale = linkedSale;
    return order as RestaurantOrder & { linkedSale?: Sale | null };
  }

  private async assertStaffInBranch(staffId: number, branchId: number): Promise<void> {
    const staff = await this.usersService.findOne(staffId);
    if (!staff.branchId || staff.branchId !== branchId) {
      throw new BadRequestException('Assigned staff must belong to this branch');
    }
  }

  async updateOrder(orderId: number, dto: UpdateRestaurantOrderDto, user: RequestUser): Promise<RestaurantOrder> {
    const order = await this.findOne(orderId, user);
    if (order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Only open orders can be edited');
    }

    if (dto.tableLabel !== undefined) {
      order.tableLabel = dto.tableLabel;
    }
    if (dto.notes !== undefined) {
      order.notes = dto.notes;
    }
    if (dto.assignedStaffId !== undefined) {
      if (dto.assignedStaffId === null) {
        order.assignedStaffId = null;
      } else {
        await this.assertStaffInBranch(dto.assignedStaffId, order.branchId);
        order.assignedStaffId = dto.assignedStaffId;
      }
    }

    await this.orderRepository.save(order);
    return (await this.findOne(orderId, user)) as RestaurantOrder;
  }

  async addLines(orderId: number, dto: AddRestaurantOrderLinesDto, user: RequestUser): Promise<RestaurantOrder> {
    const order = await this.findOne(orderId, user);
    if (order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Cannot add lines to a closed order');
    }
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one line is required');
    }

    for (const line of dto.lines) {
      const product = await this.productsService.findOne(line.productId);
      const unitPrice = line.unitPrice ?? Number(product.defaultPrice);
      await this.lineRepository.save(
        this.lineRepository.create({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice,
          notes: line.notes ?? null,
          status: RestaurantOrderLineStatus.QUEUED,
        }),
      );
    }

    return (await this.findOne(orderId, user)) as RestaurantOrder;
  }

  async updateLineFields(
    lineId: number,
    dto: UpdateRestaurantOrderLineDto,
    user: RequestUser,
  ): Promise<RestaurantOrderLine> {
    const line = await this.lineRepository.findOne({
      where: { id: lineId },
      relations: ['order', 'order.branch'],
    });
    if (!line) {
      throw new NotFoundException('Order line not found');
    }
    await this.assertBranchAccess(line.order, user);
    if (line.order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Cannot edit lines on a closed order');
    }
    if (line.status !== RestaurantOrderLineStatus.QUEUED) {
      throw new BadRequestException('Only queued lines can be amended');
    }

    if (dto.quantity !== undefined) line.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) line.unitPrice = dto.unitPrice;
    if (dto.notes !== undefined) line.notes = dto.notes;

    return await this.lineRepository.save(line);
  }

  async removeLine(lineId: number, user: RequestUser): Promise<void> {
    const line = await this.lineRepository.findOne({
      where: { id: lineId },
      relations: ['order', 'order.branch'],
    });
    if (!line) {
      throw new NotFoundException('Order line not found');
    }
    await this.assertBranchAccess(line.order, user);
    if (line.order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Cannot remove lines on a closed order');
    }
    if (line.status !== RestaurantOrderLineStatus.QUEUED) {
      throw new BadRequestException('Only queued lines can be removed');
    }
    await this.lineRepository.remove(line);
  }

  async recordPayment(
    orderId: number,
    dto: RecordRestaurantOrderPaymentDto,
    user: RequestUser,
  ): Promise<Awaited<ReturnType<PaymentsService['createPayment']>>> {
    const order = await this.findOne(orderId, user);
    if (order.status !== RestaurantOrderStatus.BILLED) {
      throw new BadRequestException('Order must be billed before recording payment');
    }
    const sale = await this.saleRepository.findOne({
      where: { restaurantOrderId: order.id },
      relations: ['payment'],
    });
    if (!sale) {
      throw new NotFoundException('No sale linked to this order');
    }
    if (sale.payment) {
      throw new BadRequestException('Payment already recorded for this order');
    }

    const amount = dto.amount ?? Number(sale.totalAmount);

    return this.paymentsService.createPayment(
      {
        saleId: sale.id,
        amount,
        method: dto.method,
        mpesaReference: dto.mpesaReference,
      },
      user.userId,
      user,
    );
  }

  async updateLineStatus(
    lineId: number,
    dto: UpdateLineStatusDto,
    user: RequestUser,
  ): Promise<RestaurantOrderLine> {
    const line = await this.lineRepository.findOne({
      where: { id: lineId },
      relations: ['order', 'order.branch', 'product'],
    });
    if (!line) {
      throw new NotFoundException('Order line not found');
    }
    await this.assertBranchAccess(line.order, user);

    if (line.order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Cannot change lines on a closed order');
    }

    line.status = dto.status;
    return await this.lineRepository.save(line);
  }

  async billOrder(orderId: number, dto: BillRestaurantOrderDto, user: RequestUser): Promise<{ sale: Awaited<ReturnType<SalesService['create']>> }> {
    const order = await this.findOne(orderId, user);
    if (order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Order is not open');
    }

    const unserved = (order.lines || []).filter((l) => l.status !== RestaurantOrderLineStatus.SERVED);
    if (unserved.length > 0 && !dto.allowIncompleteServe) {
      throw new BadRequestException(
        'All lines must be served before billing (or enable “bill before served” on this request)',
      );
    }

    const items = (order.lines || []).map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    }));

    const sale = await this.salesService.create(
      {
        sessionId: order.sessionId,
        items,
        paymentMethod: dto.paymentMethod,
        customerId: dto.customerId,
        restaurantOrderId: order.id,
      },
      user,
    );

    return { sale };
  }

  async voidOrder(orderId: number, user: RequestUser): Promise<RestaurantOrder> {
    const order = await this.findOne(orderId, user);
    if (order.status !== RestaurantOrderStatus.OPEN) {
      throw new BadRequestException('Only open orders can be voided');
    }
    order.status = RestaurantOrderStatus.VOID;
    return await this.orderRepository.save(order);
  }

  /** Kitchen prep summary: counts by product for open lines in session */
  async getKitchenSummary(sessionId: number, user: RequestUser): Promise<{
    byProduct: {
      productId: number;
      productName: string;
      quantity: number;
      queued: number;
      cooking: number;
      ready: number;
      /** Groceries / drinks — no grill step; hand out when queued */
      skipCookPrep: boolean;
    }[];
    dineInOrders: number;
    takeawayOrders: number;
  }> {
    const session = await this.stockSessionsService.findOne(sessionId);
    if (!this.isAdmin(user)) {
      if (!user.branchId || session.branchId !== user.branchId) {
        throw new ForbiddenException('Invalid session');
      }
    }
    await this.assertPorkBranch(session.branchId);

    const orders = await this.orderRepository.find({
      where: { sessionId, status: RestaurantOrderStatus.OPEN },
      relations: ['lines', 'lines.product'],
    });

    const byProduct = new Map<
      number,
      {
        productId: number;
        productName: string;
        quantity: number;
        queued: number;
        cooking: number;
        ready: number;
        skipCookPrep: boolean;
      }
    >();

    let dineInOrders = 0;
    let takeawayOrders = 0;

    for (const o of orders) {
      if (o.serviceType === RestaurantServiceType.DINE_IN) dineInOrders += 1;
      else takeawayOrders += 1;

      for (const line of o.lines || []) {
        if (line.status === RestaurantOrderLineStatus.SERVED) continue;
        const pid = line.productId;
        const name = line.product?.name || 'Product';
        if (!byProduct.has(pid)) {
          byProduct.set(pid, {
            productId: pid,
            productName: name,
            quantity: 0,
            queued: 0,
            cooking: 0,
            ready: 0,
            skipCookPrep: line.product?.category === ProductCategory.CONSUMABLE,
          });
        }
        const row = byProduct.get(pid)!;
        row.quantity += Number(line.quantity);
        if (line.status === RestaurantOrderLineStatus.QUEUED) row.queued += Number(line.quantity);
        if (line.status === RestaurantOrderLineStatus.COOKING) row.cooking += Number(line.quantity);
        if (line.status === RestaurantOrderLineStatus.READY) row.ready += Number(line.quantity);
      }
    }

    return {
      byProduct: Array.from(byProduct.values()),
      dineInOrders,
      takeawayOrders,
    };
  }
}
