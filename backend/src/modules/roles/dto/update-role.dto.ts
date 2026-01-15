import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'staff', description: 'Updated name of the role' })
  @IsString()
  @IsOptional()
  name?: string;
}