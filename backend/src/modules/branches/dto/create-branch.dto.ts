import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BranchType } from '../entities/branch.entity';

export class CreateBranchDto {
  @ApiProperty({ example: 'Lake Town Main Butchery' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MAIN' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: BranchType, example: BranchType.GENERAL_BUTCHERY })
  @IsEnum(BranchType)
  type: BranchType;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
