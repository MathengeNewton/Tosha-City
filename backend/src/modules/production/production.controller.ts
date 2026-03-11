import {
  Body,
  Controller,
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
import { ProductionService } from './production.service';
import { CreateProductionRunDto } from './dto/create-production-run.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

function isAdminUser(user: { roles?: Array<{ name?: string } | string> }) {
  return (user?.roles || []).some((role) =>
    typeof role === 'string' ? role === UserRole.ADMIN : role?.name === UserRole.ADMIN,
  );
}

@ApiTags('Production')
@Controller('production')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Record a production run' })
  create(@Body() createProductionRunDto: CreateProductionRunDto, @Request() req) {
    return this.productionService.create(createProductionRunDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get production runs' })
  @ApiQuery({ name: 'sessionId', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: Number, description: 'Admin only filter' })
  findAll(@Request() req, @Query('sessionId') sessionId?: string, @Query('branchId') branchId?: string) {
    const scopedBranchId = isAdminUser(req.user) ? (branchId ? +branchId : undefined) : req.user.branchId;
    return this.productionService.findAll(sessionId ? +sessionId : undefined, scopedBranchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a production run by ID' })
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(+id);
  }
}
