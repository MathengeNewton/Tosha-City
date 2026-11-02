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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseCategory } from './entities/expense.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({
    summary: 'Record an expense paid during a stock session (Admin/Cashier)',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(dto, req.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'List expenses (optional filters)' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: ExpenseCategory })
  findAll(
    @Query('sessionId') sessionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ) {
    return this.expensesService.findAll({
      sessionId: sessionId ? +sessionId : undefined,
      startDate,
      endDate,
      category: Object.values(ExpenseCategory).includes(
        category as ExpenseCategory,
      )
        ? (category as ExpenseCategory)
        : undefined,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get an expense by ID' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({
    summary: 'Edit an expense (cashier while session is open, admin any time)',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Request() req,
  ) {
    return this.expensesService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({
    summary:
      'Delete an expense (cashier while session is open, admin any time)',
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.expensesService.remove(+id, req.user);
  }
}
