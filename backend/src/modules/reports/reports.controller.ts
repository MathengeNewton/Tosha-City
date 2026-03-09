import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sales report (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  getSalesReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getSalesReport(filters);
  }

  @Get('stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get stock report (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  getStockReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getStockReport(filters);
  }

  @Get('wastage')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get wastage report (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  getWastageReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getWastageReport(filters);
  }

  @Get('weekly-comparison')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get weekly sales comparison (Admin only)' })
  getWeeklyComparison() {
    return this.reportsService.getWeeklyComparison();
  }

  @Get('daily-summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get daily summary (Admin only)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  getDailySummary(@Query('date') date?: string) {
    return this.reportsService.getDailySummary(date);
  }

  @Get('stock-share')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get stock share report over time (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'partnerId', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  getStockShareReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getStockShareReport(filters);
  }
}

