import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { registerAs } from '@nestjs/config';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    autoLoadEntities: true,
    entities: [__dirname + '/../../modules/**/*.entity.{ts,js}'],
    synchronize: true,
    logging: process.env.DB_LOG_QUERIES === 'true' ? true : ['error', 'warn'],
    maxQueryExecutionTime: 1000,
    migrationsRun: true,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  }),
);
