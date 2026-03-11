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
import { StockSessionsService } from './stock-sessions.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { SessionStatus } from './entities/stock-session.entity';

function isAdminUser(user: { roles?: Array<{ name?: string } | string> }) {
  return (user?.roles || []).some((role) =>
    typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
  );
}

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
    return await this.stockSessionsService.openSession(openSessionDto, req.user);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'Close a stock session (Admin/Cashier)' })
  async closeSession(@Param('id') id: string, @Request() req) {
    return await this.stockSessionsService.closeSession(+id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a stock session (Admin only)' })
  async update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto, @Request() req) {
    return await this.stockSessionsService.update(+id, updateSessionDto, req.user?.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a stock session (Admin only, only if no entries/sales)' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.stockSessionsService.remove(+id, req.user?.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock sessions with optional filters and statistics' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus, description: 'Filter by session status' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Branch ID filter (admin only)' })
  findAll(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: SessionStatus,
    @Query('branchId') branchId?: string,
  ) {
    const scopedBranchId = isAdminUser(req.user) ? (branchId ? +branchId : undefined) : req.user.branchId;
    // If any filter is provided, use findAllWithStats, otherwise use simple findAll
    if (dateFrom || dateTo || status || scopedBranchId) {
      return this.stockSessionsService.findAllWithStats(dateFrom, dateTo, status, scopedBranchId);
    }
    return this.stockSessionsService.findAll(scopedBranchId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open session' })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Branch ID filter (admin only)' })
  findCurrent(@Request() req, @Query('branchId') branchId?: string) {
    const scopedBranchId = isAdminUser(req.user) ? (branchId ? +branchId : undefined) : req.user.branchId;
    return this.stockSessionsService.findCurrent(scopedBranchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock session by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    const scopedBranchId = isAdminUser(req.user) ? undefined : req.user.branchId;
    return this.stockSessionsService.findOne(+id, scopedBranchId);
  }
}

