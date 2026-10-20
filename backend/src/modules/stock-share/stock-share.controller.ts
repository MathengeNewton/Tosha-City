import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UpdateStockShareDto } from './dto/update-stock-share.dto';
import { ShareDirection } from './entities/stock-share.entity';
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
  @ApiOperation({ summary: 'Record meat shared with a partner (given out or received in)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateStockShareDto, @Request() req) {
    return this.stockShareService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock shares (optional filters)' })
  @ApiQuery({ name: 'partnerId', required: false, type: Number })
  @ApiQuery({ name: 'paid', required: false, type: Boolean })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'direction', required: false, enum: ShareDirection })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('paid') paid?: string,
    @Query('sessionId') sessionId?: string,
    @Query('direction') direction?: string,
  ) {
    const partnerIdNum = partnerId ? +partnerId : undefined;
    const paidBool = paid === 'true' ? true : paid === 'false' ? false : undefined;
    const sessionIdNum = sessionId ? +sessionId : undefined;
    const directionEnum = Object.values(ShareDirection).includes(direction as ShareDirection)
      ? (direction as ShareDirection)
      : undefined;
    return this.stockShareService.findAll(partnerIdNum, paidBool, sessionIdNum, directionEnum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock share by ID' })
  findOne(@Param('id') id: string) {
    return this.stockShareService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Edit a stock share (keeps its linked stock entry in sync)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id') id: string, @Body() dto: UpdateStockShareDto, @Request() req) {
    return this.stockShareService.update(+id, dto, req.user.userId);
  }

  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Mark a stock share as paid (partner paid us, or we paid partner for incoming)' })
  markPaid(@Param('id') id: string) {
    return this.stockShareService.markPaid(+id);
  }
}
