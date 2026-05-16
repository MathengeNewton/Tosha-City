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
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

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
    return this.salesService.create(createSaleDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales (with optional filters)' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: Number, description: 'Filter by product (sale contains this product)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date YYYY-MM-DD' })
  findAll(
    @Query('sessionId') sessionId?: string,
    @Query('productId') productId?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.salesService.findAll(
      sessionId ? +sessionId : undefined,
      productId ? +productId : undefined,
      date,
      dateFrom,
      dateTo,
    );
  }

  @Get('product-availability')
  @ApiOperation({ summary: 'Available quantity to sell for a product in a session' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  @ApiQuery({ name: 'productId', required: true, type: Number })
  getProductAvailability(
    @Query('sessionId') sessionId: string,
    @Query('productId') productId: string,
  ) {
    return this.salesService.getProductAvailability(+sessionId, +productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale by ID' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }

  @Get(':id/payment')
  @ApiOperation({ summary: 'Get payment for a sale' })
  getPayment(@Param('id') id: string) {
    return this.salesService.getPaymentForSale(+id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get plain text receipt for a paid sale' })
  async getReceipt(@Param('id') id: string, @Res() res: Response) {
    const receiptText = await this.salesService.generatePlainTextReceipt(+id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(receiptText);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a sale (Admin only)' })
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto, @Request() req) {
    return this.salesService.update(+id, updateSaleDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a sale (Admin only)' })
  remove(@Param('id') id: string, @Request() req) {
    return this.salesService.remove(+id, req.user?.userId);
  }
}

