import { Body, Controller, Get, Patch, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';
import { SaleSettingsService } from './sale-settings.service';
import { UpdateSaleSettingsDto } from './dto/update-sale-settings.dto';

@ApiTags('Sale settings')
@Controller('sale-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SaleSettingsController {
  constructor(private readonly saleSettingsService: SaleSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Till and receipt configuration (tables, cooking fee, receipt details)' })
  get() {
    return this.saleSettingsService.get();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update till and receipt configuration (Admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Body() dto: UpdateSaleSettingsDto) {
    return this.saleSettingsService.update(dto);
  }
}
