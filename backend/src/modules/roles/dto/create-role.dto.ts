import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'admin', description: 'Name of the role' })
  @IsString()
  @IsNotEmpty()
  name: string;
}