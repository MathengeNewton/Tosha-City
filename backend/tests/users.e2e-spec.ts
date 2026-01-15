import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

class MockJwtAuthGuard { canActivate() { return true; } }
class MockRolesGuard { canActivate() { return true; } }

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: [{ name: 'user' }]
  };

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn().mockImplementation((id) => {
      return Promise.resolve(id === 1 ? mockUser : null);
    }),
    create: jest.fn().mockImplementation((dto) => {
      const { password, ...userWithoutPassword } = dto;
      return Promise.resolve({ id: 2, ...userWithoutPassword, roles: [] });
    }),
    update: jest.fn().mockImplementation((id, dto) => {
      const { password, ...userWithoutPassword } = dto;
      return Promise.resolve({ ...mockUser, ...userWithoutPassword });
    }),
    remove: jest.fn().mockResolvedValue(undefined),
    assignRoles: jest.fn().mockImplementation((userId, roleIds) => {
      const roles = roleIds.map(id => ({ id, name: `role${id}` }));
      return Promise.resolve({ ...mockUser, roles });
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return an array of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);
      
      expect(response.body).toEqual([mockUser]);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('should return a single user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/1')
        .expect(200);
      
      expect(response.body).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should return 404 if user not found', async () => {
      await request(app.getHttpServer())
        .get('/users/999')
        .expect(404);
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const createDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createDto)
        .expect(201);
      
      expect(response.body).toEqual({
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        roles: []
      });
      expect(mockUsersService.create).toHaveBeenCalledWith(createDto);
    });

    it('should return 400 if validation fails', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ invalid: 'data' })
        .expect(400);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', async () => {
      const updateDto = { username: 'updateduser' };
      
      const response = await request(app.getHttpServer())
        .put('/users/1')
        .send(updateDto)
        .expect(200);
      
      expect(response.body.username).toBe('updateduser');
      expect(mockUsersService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      await request(app.getHttpServer())
        .delete('/users/1')
        .expect(200);
      
      expect(mockUsersService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /users/:id/roles', () => {
    it('should assign roles to a user', async () => {
      const rolesDto = { roleIds: [1, 2] };
      
      const response = await request(app.getHttpServer())
        .post('/users/1/roles')
        .send(rolesDto)
        .expect(201);
      
      expect(response.body.roles).toHaveLength(2);
      expect(mockUsersService.assignRoles).toHaveBeenCalledWith(1, [1, 2]);
    });
  });

  describe('GET /users/me', () => {
    it('should return the current user profile', async () => {
      // Mock the request user
      const mockRequest = { user: { userId: 1 } };
      
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .expect(200);
      
      expect(response.body).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });
  });
});
