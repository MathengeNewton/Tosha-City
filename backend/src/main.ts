import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

/** True for browser origins on RFC1918 addresses, any port. */
function isPrivateLanOrigin(origin: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((n) => n > 255)) return false;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  const allowedOrigins = [
    'https://admin.laketown.co.ke', // Production frontend
    'http://admin.laketown.co.ke', // Production frontend (HTTP redirect)
    'http://localhost:3000', // Local development
    'http://localhost:3001', // Alternative local port
    'http://localhost:3015', // Docker frontend port
    'http://127.0.0.1:3000', // Local development (IP)
    'http://127.0.0.1:3001', // Alternative local port (IP)
    'http://127.0.0.1:3015', // Docker frontend port (IP)
  ];

  // Add frontend URL from environment if set
  if (process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.trim();
    if (!allowedOrigins.includes(frontendUrl)) {
      allowedOrigins.push(frontendUrl);
    }
    // Also add HTTPS version if HTTP is provided
    if (frontendUrl.startsWith('http://')) {
      const httpsUrl = frontendUrl.replace('http://', 'https://');
      if (!allowedOrigins.includes(httpsUrl)) {
        allowedOrigins.push(httpsUrl);
      }
    }
  }

  // Development origins are handled via environment variables
  // Add custom origins from environment if needed
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o);
    allowedOrigins.push(...customOrigins);
  }

  // In development, allow all localhost origins
  const isDevelopment = process.env.NODE_ENV !== 'production';
  // Shop tills open the dashboard by LAN IP (http://192.168.x.x:3015). That is
  // not localhost. Always allow it. A production deploy used to pass
  // CORS_ALLOW_LAN=false and the till failed again after every release.

  console.log('CORS Configuration:', {
    isDevelopment,
    allowLan: true,
    allowedOrigins,
    frontendUrl: process.env.FRONTEND_URL,
  });

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log('CORS: Allowing request with no origin');
        return callback(null, true);
      }
      
      // In development, allow any localhost origin
      if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        console.log(`CORS: Allowing development origin: ${origin}`);
        return callback(null, true);
      }

      if (isPrivateLanOrigin(origin)) {
        console.log(`CORS: Allowing LAN origin: ${origin}`);
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log(`CORS: Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked origin: ${origin}`);
        console.warn(`CORS: Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LakeTown Butchery API')
    .setDescription('API documentation for the LakeTown Butchery platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
