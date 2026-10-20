import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SetCustomerPriceDto } from './dto/set-customer-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { CustomerType } from './entities/customer.entity';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a new customer (Admin/Cashier)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: CustomerType })
  @ApiQuery({ name: 'isWholesale', required: false, type: Boolean })
  @ApiQuery({ name: 'creditEnabled', required: false, type: Boolean })
  findAll(
    @Query('activeOnly') activeOnly?: string,
    @Query('type') type?: CustomerType,
    @Query('isWholesale') isWholesale?: string,
    @Query('creditEnabled') creditEnabled?: string,
  ) {
    const wholesaleFilter =
      isWholesale === 'true' ? true : isWholesale === 'false' ? false : undefined;
    return this.customersService.findAll(
      activeOnly === 'true',
      type,
      wholesaleFilter,
      creditEnabled === 'true' ? true : undefined,
    );
  }

  @Get('credit/balances')
  @ApiOperation({ summary: 'Get credit customers with outstanding balances' })
  getCreditCustomersWithBalances() {
    return this.customersService.getCreditCustomersWithBalances();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(+id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get outstanding balance for a credit customer' })
  getOutstandingBalance(@Param('id') id: string) {
    return this.customersService.getBalanceSummary(+id);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Special per-product prices for a wholesale customer' })
  getPrices(@Param('id') id: string) {
    return this.customersService.getPrices(+id);
  }

  @Put(':id/prices/:productId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set a special price for a product for this wholesale customer (Admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  setPrice(@Param('id') id: string, @Param('productId') productId: string, @Body() dto: SetCustomerPriceDto) {
    return this.customersService.setPrice(+id, +productId, dto.price);
  }

  @Delete(':id/prices/:productId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a special price; the product wholesale price applies again (Admin only)' })
  removePrice(@Param('id') id: string, @Param('productId') productId: string) {
    return this.customersService.removePrice(+id, +productId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a customer (Admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a customer (Admin only)' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(+id);
  }
}



