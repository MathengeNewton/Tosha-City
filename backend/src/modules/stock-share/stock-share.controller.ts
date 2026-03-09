import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockShareService } from './stock-share.service';
import { CreateStockShareDto } from './dto/create-stock-share.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Stock Share')
@Controller('stock-share')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockShareController {
  constructor(private readonly stockShareService: StockShareService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Record a stock share to a partner' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateStockShareDto, @Request() req) {
    return this.stockShareService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock shares (optional filters)' })
  @ApiQuery({ name: 'partnerId', required: false, type: Number })
  @ApiQuery({ name: 'paid', required: false, type: Boolean })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('paid') paid?: string,
  ) {
    const partnerIdNum = partnerId ? +partnerId : undefined;
    const paidBool = paid === 'true' ? true : paid === 'false' ? false : undefined;
    return this.stockShareService.findAll(partnerIdNum, paidBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock share by ID' })
  findOne(@Param('id') id: string) {
    return this.stockShareService.findOne(+id);
  }

  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Mark a stock share as paid' })
  markPaid(@Param('id') id: string) {
    return this.stockShareService.markPaid(+id);
  }
}
