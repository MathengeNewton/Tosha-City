import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  getSalesReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getSalesReport(filters);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Get stock report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  getStockReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getStockReport(filters);
  }

  @Get('wastage')
  @ApiOperation({ summary: 'Get wastage report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  getWastageReport(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getWastageReport(filters);
  }

  @Get('weekly-comparison')
  @ApiOperation({ summary: 'Get weekly sales comparison' })
  getWeeklyComparison() {
    return this.reportsService.getWeeklyComparison();
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Get daily summary' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  getDailySummary(@Query('date') date?: string) {
    return this.reportsService.getDailySummary(date);
  }
}

