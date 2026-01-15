// Placeholder for app/environment configuration
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
}));
