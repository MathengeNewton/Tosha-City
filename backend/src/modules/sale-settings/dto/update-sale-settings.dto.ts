import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSaleSettingsDto {
  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cookingFeePerKg?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tables?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiptLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiptPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paybillNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paybillAccount?: string;
}
