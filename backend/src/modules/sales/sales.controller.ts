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
} from '@nestjs/common';
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
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  findAll(@Query('sessionId') sessionId?: string, @Query('date') date?: string) {
    return this.salesService.findAll(sessionId ? +sessionId : undefined, date);
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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Update a sale (Cashier/Admin)' })
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto, @Request() req) {
    return this.salesService.update(+id, updateSaleDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Delete a sale (Cashier/Admin)' })
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }
}

