import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DEFAULT_APP_TIMEZONE } from '../src/common/time/app-time';

describe('App (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('GET /api returns hello', () => {
    return request(app!.getHttpServer()).get('/api').expect(200).expect('Hello World!');
  });

  it('GET /api/health returns Nairobi timezone metadata', () => {
    return request(app!.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.timezone).toBe(DEFAULT_APP_TIMEZONE);
        expect(res.body.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(res.body.localTime).toBeTruthy();
        expect(res.body.timestamp).toBeTruthy();
      });
  });
});
