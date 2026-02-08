import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  const allowedOrigins = [
    'https://admin.toshacity.co.ke', // Production frontend
    'http://admin.toshacity.co.ke', // Production frontend (HTTP redirect)
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

  console.log('CORS Configuration:', {
    isDevelopment,
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
    .setTitle('ToshaCity Butchery API')
    .setDescription('API documentation for the ToshaCity Butchery platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
