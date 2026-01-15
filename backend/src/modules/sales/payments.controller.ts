import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { PaymentMethod } from './entities/payment.enums';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Record payment for a sale (Cashier/Admin)' })
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.createPayment(createPaymentDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments (with optional filters)' })
  @ApiQuery({ name: 'saleId', required: false, type: Number })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  findAll(
    @Query('saleId') saleId?: string,
    @Query('method') method?: PaymentMethod,
    @Query('date') date?: string,
  ) {
    return this.paymentsService.findAll({
      saleId: saleId ? +saleId : undefined,
      method,
      date,
    });
  }

  @Get('sale/:saleId')
  @ApiOperation({ summary: 'Get payment for a specific sale' })
  findBySaleId(@Param('saleId') saleId: string) {
    return this.paymentsService.findPaymentBySaleId(+saleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }
}

