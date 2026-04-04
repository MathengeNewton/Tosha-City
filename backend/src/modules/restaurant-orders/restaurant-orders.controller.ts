import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateLineStatusDto } from './dto/update-line-status.dto';
import { BillRestaurantOrderDto } from './dto/bill-restaurant-order.dto';
import { UpdateRestaurantOrderDto } from './dto/update-restaurant-order.dto';
import { AddRestaurantOrderLinesDto } from './dto/add-restaurant-order-lines.dto';
import { UpdateRestaurantOrderLineDto } from './dto/update-restaurant-order-line.dto';
import { RecordRestaurantOrderPaymentDto } from './dto/record-restaurant-order-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { RestaurantOrderStatus } from './entities/restaurant-order.entity';

@ApiTags('Restaurant orders')
@Controller('restaurant-orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RestaurantOrdersController {
  constructor(private readonly restaurantOrdersService: RestaurantOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a kitchen/restaurant order (pork branch only)' })
  create(@Body() dto: CreateRestaurantOrderDto, @Request() req) {
    return this.restaurantOrdersService.create(dto, req.user);
  }

  @Get('kitchen-summary')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.CASHIER,
    UserRole.KITCHEN,
    UserRole.WAITER,
    UserRole.STAFF,
  )
  @ApiOperation({ summary: 'Aggregated prep counts for a session (open orders, unserved lines)' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  getKitchenSummary(@Query('sessionId') sessionId: string, @Request() req) {
    return this.restaurantOrdersService.getKitchenSummary(+sessionId, req.user);
  }

  @Get('staff-options')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.WAITER, UserRole.STAFF)
  @ApiOperation({ summary: 'Users in the branch for table assignment (pork branch)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Admin only' })
  getStaffOptions(@Request() req, @Query('branchId') branchId?: string) {
    return this.restaurantOrdersService.getStaffOptions(req.user, branchId ? +branchId : undefined);
  }

  @Get()
  @ApiOperation({ summary: 'List restaurant orders (branch-scoped)' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RestaurantOrderStatus })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Admin only' })
  @ApiQuery({
    name: 'list',
    required: false,
    enum: ['active', 'closed', 'all'],
    description: 'active = OPEN; closed = BILLED + VOID; all = any (use status for a single status)',
  })
  findAll(
    @Request() req,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: RestaurantOrderStatus,
    @Query('branchId') branchId?: string,
    @Query('list') list?: 'active' | 'closed' | 'all',
  ) {
    return this.restaurantOrdersService.findAll(req.user, {
      sessionId: sessionId ? +sessionId : undefined,
      status,
      branchId: branchId ? +branchId : undefined,
      list,
    });
  }

  @Patch('lines/:lineId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.KITCHEN, UserRole.CASHIER, UserRole.STAFF, UserRole.WAITER)
  @ApiOperation({ summary: 'Update kitchen line status (queued → cooking → ready; waiter marks served)' })
  updateLineStatus(
    @Param('lineId') lineId: string,
    @Body() dto: UpdateLineStatusDto,
    @Request() req,
  ) {
    return this.restaurantOrdersService.updateLineStatus(+lineId, dto, req.user);
  }

  @Patch('lines/:lineId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Amend a queued line (quantity, price, notes)' })
  updateLineFields(
    @Param('lineId') lineId: string,
    @Body() dto: UpdateRestaurantOrderLineDto,
    @Request() req,
  ) {
    return this.restaurantOrdersService.updateLineFields(+lineId, dto, req.user);
  }

  @Delete('lines/:lineId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Remove a queued line' })
  removeLine(@Param('lineId') lineId: string, @Request() req) {
    return this.restaurantOrdersService.removeLine(+lineId, req.user);
  }

  @Post(':id/lines')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Add lines to an open order' })
  addLines(@Param('id') id: string, @Body() dto: AddRestaurantOrderLinesDto, @Request() req) {
    return this.restaurantOrdersService.addLines(+id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update table label, notes, or assigned staff (open orders)' })
  updateOrder(@Param('id') id: string, @Body() dto: UpdateRestaurantOrderDto, @Request() req) {
    return this.restaurantOrdersService.updateOrder(+id, dto, req.user);
  }

  @Post(':id/bill')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Create sale from order and mark order billed' })
  bill(@Param('id') id: string, @Body() dto: BillRestaurantOrderDto, @Request() req) {
    return this.restaurantOrdersService.billOrder(+id, dto, req.user);
  }

  @Post(':id/record-payment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Record payment for the sale linked to a billed table order' })
  recordPayment(@Param('id') id: string, @Body() dto: RecordRestaurantOrderPaymentDto, @Request() req) {
    return this.restaurantOrdersService.recordPayment(+id, dto, req.user);
  }

  @Post(':id/void')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Void an open order' })
  voidOrder(@Param('id') id: string, @Request() req) {
    return this.restaurantOrdersService.voidOrder(+id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one restaurant order (includes linked sale when billed)' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.restaurantOrdersService.findOne(+id, req.user);
  }
}
