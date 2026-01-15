import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockSessionsService } from './stock-sessions.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Stock Sessions')
@Controller('stock-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockSessionsController {
  constructor(private readonly stockSessionsService: StockSessionsService) {}

  @Post('open')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Open a new stock session (Cashier/Admin)' })
  async openSession(@Body() openSessionDto: OpenSessionDto, @Request() req) {
    return await this.stockSessionsService.openSession(openSessionDto, req.user.userId);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Close a stock session (Cashier/Admin)' })
  async closeSession(@Param('id') id: string, @Request() req) {
    return await this.stockSessionsService.closeSession(+id, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock sessions' })
  findAll() {
    return this.stockSessionsService.findAll();
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open session' })
  findCurrent() {
    return this.stockSessionsService.findCurrent();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock session by ID' })
  findOne(@Param('id') id: string) {
    return this.stockSessionsService.findOne(+id);
  }
}

