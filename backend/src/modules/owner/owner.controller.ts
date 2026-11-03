import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { OwnerSummaryService } from './owner-summary.service';
import { OwnerAlertsService } from './owner-alerts.service';
import { OwnerNotificationsService } from './owner-notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('Owner')
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@ApiBearerAuth()
export class OwnerController {
  constructor(
    private readonly summary: OwnerSummaryService,
    private readonly alerts: OwnerAlertsService,
    private readonly notifications: OwnerNotificationsService,
  ) {}

  @Get('daily-summary')
  @ApiOperation({ summary: 'Money in / money out for one day, expected cash in drawer, stock check (Owner/Admin)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD, defaults to today' })
  getDailySummary(@Query('date') date?: string) {
    return this.summary.getDailySummary(date);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Warning signs: edits/deletions, low prices, stock shortages, unusual wastage (Owner/Admin)' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'YYYY-MM-DD, defaults to 6 days before `to`' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'YYYY-MM-DD, defaults to today' })
  getAlerts(@Query('from') from?: string, @Query('to') to?: string) {
    return this.alerts.getAlerts(from, to);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Daily sales/collected/expenses, best and worst sellers, expenses by category (Owner/Admin)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '7–90, defaults to 30' })
  getTrends(@Query('days') days?: string) {
    return this.summary.getTrends(days);
  }

  @Get('credit')
  @ApiOperation({ summary: 'Customers who still owe money, biggest balance first (Owner/Admin)' })
  getCredit() {
    return this.summary.getCreditCustomers();
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register this phone for owner push notifications' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerDevice(@Body() dto: RegisterDeviceDto, @Request() req) {
    return this.notifications.registerDevice(req.user.userId, dto.token, dto.platform);
  }

  @Delete('devices/:token')
  @ApiOperation({ summary: 'Stop push notifications to this phone' })
  removeDevice(@Param('token') token: string, @Request() req) {
    return this.notifications.removeDevice(req.user.userId, token);
  }

  @Post('devices/test')
  @ApiOperation({ summary: 'Send a test notification to your registered phones' })
  sendTest(@Request() req) {
    return this.notifications.sendTest(req.user.userId);
  }
}
