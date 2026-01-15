import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Region } from '../src/modules/regions/entities/region.entity';
import { AppModule } from '../src/app.module';

// Mock Guards
class MockJwtAuthGuard {
  canActivate() { return true; }
}

class MockRolesGuard {
  canActivate() { return true; }
}

describe('RegionsController (e2e)', () => {
  let app: INestApplication;
  
  // Mock data
  const testRegion = {
    id: 1,
    name: 'Test Region',
    code: 'TR',
    coordinates: ['-1.2921,36.8219'],
    description: 'Test Description'
  };

  const mockRegionsService = {
    findAll: jest.fn().mockResolvedValue([testRegion]),
    findOne: jest.fn().mockResolvedValue(testRegion),
    create: jest.fn().mockResolvedValue(testRegion),
    update: jest.fn().mockResolvedValue({ ...testRegion, name: 'Updated Region' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(Region))
      .useValue({})
      .overrideProvider('RegionsService')
      .useValue(mockRegionsService)
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /regions', () => {
    it('should return all regions', async () => {
      const response = await request(app.getHttpServer())
        .get('/regions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(mockRegionsService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /regions/:id', () => {
    it('should return a single region', async () => {
      const response = await request(app.getHttpServer())
        .get(`/regions/1`)
        .expect(200);

      expect(response.body).toMatchObject(testRegion);
      expect(mockRegionsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /regions', () => {
    it('should create a new region', async () => {
      const response = await request(app.getHttpServer())
        .post('/regions')
        .send(testRegion)
        .expect(201);

      expect(response.body).toMatchObject(testRegion);
      expect(mockRegionsService.create).toHaveBeenCalledWith(testRegion);
    });
  });

  describe('PUT /regions/:id', () => {
    it('should update a region', async () => {
      const updateData = { name: 'Updated Region' };
      const response = await request(app.getHttpServer())
        .put('/regions/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
      expect(mockRegionsService.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('DELETE /regions/:id', () => {
    it('should delete a region', async () => {
      await request(app.getHttpServer())
        .delete('/regions/1')
        .expect(200);

      expect(mockRegionsService.remove).toHaveBeenCalledWith(1);
    });
  });
});