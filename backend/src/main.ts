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
  ];

  // Add development origins only in development mode
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push(
      'http://localhost:3015',  // Frontend
      'http://localhost:4515',   // Backend (for direct API access)
      'http://127.0.0.1:3015',
      'http://127.0.0.1:4515',
    );
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
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
