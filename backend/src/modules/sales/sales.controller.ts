import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { AddSaleItemsDto, CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

function isAdminUser(user: { roles?: Array<{ name?: string } | string> }) {
  return (user?.roles || []).some((role) =>
    typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
  );
}

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a new sale (Cashier/Admin)' })
  create(@Body() createSaleDto: CreateSaleDto, @Request() req) {
    return this.salesService.create(createSaleDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales (with optional filters)' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: Number, description: 'Filter by product (sale contains this product)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date YYYY-MM-DD' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Branch ID filter (admin only)' })
  findAll(
    @Request() req,
    @Query('sessionId') sessionId?: string,
    @Query('productId') productId?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
  ) {
    const isAdmin = isAdminUser(req.user);
    const scopedBranchId = isAdmin ? (branchId ? +branchId : undefined) : req.user.branchId;
    if (!isAdmin && !sessionId) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
      return this.salesService.findAll(undefined, undefined, today, undefined, undefined, scopedBranchId);
    }
    return this.salesService.findAll(
      sessionId ? +sessionId : undefined,
      productId ? +productId : undefined,
      date,
      dateFrom,
      dateTo,
      scopedBranchId,
    );
  }

  @Get('kitchen-supply-balances')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'On-hand qty for KITCHEN_SUPPLY products in a session (opening+incoming−outflows)' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  getKitchenSupplyBalances(@Query('sessionId') sessionId: string) {
    return this.salesService.getKitchenSupplyBalances(+sessionId);
  }

  @Get('till-availability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Sellable products with quantity still available in this stock session' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  getTillAvailability(@Query('sessionId') sessionId: string, @Request() req) {
    return this.salesService.getTillAvailability(+sessionId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale by ID (branch-scoped for non-admins)' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.salesService.findOne(+id, req.user);
  }

  @Get(':id/payment')
  @ApiOperation({ summary: 'Get payment for a sale' })
  getPayment(@Param('id') id: string, @Request() req) {
    return this.salesService.getPaymentForSale(+id, req.user);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get plain text receipt for a paid sale' })
  async getReceipt(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const receiptText = await this.salesService.generatePlainTextReceipt(+id, req.user);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(receiptText);
  }

  @Post(':id/items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Add items to an unpaid sale (items cannot be removed once confirmed)' })
  addItems(@Param('id') id: string, @Body() dto: AddSaleItemsDto, @Request() req) {
    return this.salesService.addItems(+id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a sale (Admin only)' })
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto, @Request() req) {
    return this.salesService.update(+id, updateSaleDto, req.user.userId, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a sale (Admin only)' })
  remove(@Param('id') id: string, @Request() req) {
    return this.salesService.remove(+id, req.user?.userId, req.user);
  }
}

