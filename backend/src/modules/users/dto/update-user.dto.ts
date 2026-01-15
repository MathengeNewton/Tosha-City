import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsEmail, MinLength, IsArray } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'johndoe', description: 'Unique username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: [1, 2], description: 'Role IDs', required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  roleIds?: number[];
}
