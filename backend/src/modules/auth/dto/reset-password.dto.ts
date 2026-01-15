import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'johndoe@gmail.com', description: 'Username or email of the user requesting a password reset' })
  usernameOrEmail: string;

  @ApiProperty({ example: 'newStrongPassword123', description: 'The new password to set' })
  newPassword: string;
}
