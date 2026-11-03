import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_TYPE } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: any) {
    if (payload?.type === REFRESH_TOKEN_TYPE) {
      throw new UnauthorizedException('Refresh tokens cannot be used to call the API');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
