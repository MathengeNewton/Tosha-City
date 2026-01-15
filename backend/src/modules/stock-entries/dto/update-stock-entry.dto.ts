import { PartialType } from '@nestjs/swagger';
import { CreateStockEntryDto } from './create-stock-entry.dto';

export class UpdateStockEntryDto extends PartialType(CreateStockEntryDto) {}

