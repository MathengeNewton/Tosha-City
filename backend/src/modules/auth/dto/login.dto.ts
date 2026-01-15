import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'johndoe', description: 'Username of the user' })
  username: string;

  @ApiProperty({ example: 'strongPassword123', description: 'Password of the user' })
  password: string;
}
