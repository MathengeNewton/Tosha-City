import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: [1, 2], description: 'Role IDs', required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  roleIds?: number[];
}
