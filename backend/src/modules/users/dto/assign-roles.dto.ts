import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty } from 'class-validator';
import { UserRole } from '../../roles/entities/role.entity';

export class AssignRolesDto {
  @ApiProperty({ example: [1, 2], description: 'Array of role IDs to assign' })
  @IsArray()
  @ArrayNotEmpty()
  roles: UserRole[];
}
