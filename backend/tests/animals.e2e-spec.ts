import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AnimalsController } from '../src/modules/animals/animals.controller';
import { AnimalsService } from '../src/modules/animals/animals.service';

// --- Mock Guards ---
class MockJwtAuthGuard {
  canActivate() { return true; }
}
class MockRolesGuard {
  canActivate() { return true; }
}

describe('AnimalsController (pure mock e2e)', () => {
  let app: INestApplication;

  // Mock data and service
  const mockAnimal = {
    id: 1,
    name: 'Bella',
    species: 'Dog',
    ownerId: 1,
    status: 'Healthy',
  };
  const mockAnimalsService = {
    findAll: jest.fn().mockResolvedValue([mockAnimal]),
    create: jest.fn().mockResolvedValue(mockAnimal),
    update: jest.fn().mockResolvedValue({ ...mockAnimal, status: 'Updated' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    findOne: jest.fn().mockResolvedValue(mockAnimal),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AnimalsController],
      providers: [
        { provide: AnimalsService, useValue: mockAnimalsService },
      ],
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalGuards(new MockJwtAuthGuard(), new MockRolesGuard());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/animals (GET) returns all animals', async () => {
    const res = await request(app.getHttpServer())
      .get('/animals')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);
    expect(res.body).toEqual([mockAnimal]);
  });

  it('/animals (POST) creates an animal', async () => {
    const res = await request(app.getHttpServer())
      .post('/animals')
      .set('Authorization', 'Bearer testtoken')
      .send({ name: 'Bella', species: 'Dog', ownerId: 1 })
      .expect(201);
    expect(res.body).toEqual(mockAnimal);
  });

  it('/animals/1 (PUT) updates an animal', async () => {
    const res = await request(app.getHttpServer())
      .put('/animals/1')
      .set('Authorization', 'Bearer testtoken')
      .send({ status: 'Updated' })
      .expect(200);
    expect(res.body.status).toBe('Updated');
  });

  it('/animals/1 (DELETE) deletes an animal', async () => {
    const res = await request(app.getHttpServer())
      .delete('/animals/1')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it('/animals/1 (GET) gets animal by id', async () => {
    const res = await request(app.getHttpServer())
      .get('/animals/1')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);
    expect(res.body).toEqual(mockAnimal);
    expect(res.body.status).toBe('Healthy');
  });
});