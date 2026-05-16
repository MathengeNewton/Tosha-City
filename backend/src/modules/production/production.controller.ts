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
  findAll(@Query('sessionId') sessionId?: string) {
    return this.productionService.findAll(sessionId ? +sessionId : undefined);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Produced quantity available to sell this session' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  @ApiQuery({ name: 'productId', required: true, type: Number })
  getAvailability(@Query('sessionId') sessionId: string, @Query('productId') productId: string) {
    return this.productionService.getProducedAvailability(+sessionId, +productId);
  }

  @Get('ingredient-stock')
  @ApiOperation({ summary: 'Session stock available for a raw ingredient product' })
  @ApiQuery({ name: 'sessionId', required: true, type: Number })
  @ApiQuery({ name: 'productId', required: true, type: Number })
  getIngredientStock(@Query('sessionId') sessionId: string, @Query('productId') productId: string) {
    return this.productionService.getIngredientStock(+sessionId, +productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a production run by ID' })
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(+id);
  }
}
