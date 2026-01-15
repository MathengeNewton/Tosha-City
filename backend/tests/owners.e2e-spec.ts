import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';

class MockJwtAuthGuard { canActivate() { return true; } }
class MockRolesGuard { canActivate() { return true; } }

describe('OwnersController (e2e, placeholder)', () => {
  let app: INestApplication;
  const mockOwnersService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(null),
  };

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

  it('/owners (GET) should fail (not implemented)', async () => {
    await request(app.getHttpServer())
      .get('/owners')
      .expect(404);
  });

  it('/owners/:id (GET) should fail (not implemented)', async () => {
    await request(app.getHttpServer())
      .get('/owners/1')
      .expect(404);
  });

  it('/owners (POST) should fail (not implemented)', async () => {
    await request(app.getHttpServer())
      .post('/owners')
      .send({ name: 'Test', email: 'test@example.com' })
      .expect(404);
  });

  it('/owners/:id (PUT) should fail (not implemented)', async () => {
    await request(app.getHttpServer())
      .put('/owners/1')
      .send({ name: 'Updated' })
      .expect(404);
  });

  it('/owners/:id (DELETE) should fail (not implemented)', async () => {
    await request(app.getHttpServer())
      .delete('/owners/1')
      .expect(404);
  });
});
