import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[.+\]$/, {
    message: 'token must be an Expo push token',
  })
  token: string;

  @ApiProperty({ required: false, enum: ['android', 'ios'], example: 'android' })
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string;
}
