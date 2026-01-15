import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  // Mock Guards
  class MockJwtAuthGuard {
    canActivate() { return true; }
  }

  class MockRolesGuard {
    canActivate() { return true; }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(MockJwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .overrideGuard(MockRolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockRolesGuard());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/login (POST) - success', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin@church360.org', password: 'newStrongPassword123' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('username', 'admin');
  });

  it('/auth/login (POST) - fail (wrong password)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrongpass' })
      .expect(401);
  });

  it('/auth/login (POST) - fail (nonexistent user)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nouser', password: 'nopass' })
      .expect(401);
  });
});
