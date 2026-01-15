import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiProperty({
    description: 'Authenticated user details',
    example: {
      id: 1,
      username: 'johndoe',
      roles: ['dashboard'],
      email: 'johndoe@example.com',
    },
  })
  user: any;
}
