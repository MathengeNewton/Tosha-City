import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned by /auth/login or /auth/refresh' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
