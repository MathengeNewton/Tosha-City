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
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { StockEntryType } from './entities/stock-entry.entity';

@ApiTags('Stock Entries')
@Controller('stock-entries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockEntriesController {
  constructor(private readonly stockEntriesService: StockEntriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a stock entry (Cashier/Admin)' })
  create(@Body() createEntryDto: CreateStockEntryDto, @Request() req) {
    return this.stockEntriesService.create(createEntryDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock entries (with optional filters)' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: StockEntryType })
  findAll(
    @Query('sessionId') sessionId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: StockEntryType,
  ) {
    return this.stockEntriesService.findAll(
      sessionId ? +sessionId : undefined,
      productId ? +productId : undefined,
      type,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock entry by ID' })
  findOne(@Param('id') id: string) {
    return this.stockEntriesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Update a stock entry (Cashier/Admin)' })
  update(@Param('id') id: string, @Body() updateEntryDto: UpdateStockEntryDto, @Request() req) {
    return this.stockEntriesService.update(+id, updateEntryDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Delete a stock entry (Cashier/Admin)' })
  remove(@Param('id') id: string) {
    return this.stockEntriesService.remove(+id);
  }
}

