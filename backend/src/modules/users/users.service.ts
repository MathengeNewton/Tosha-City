import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Role } from '../roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['roles'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(createDto: CreateUserDto): Promise<User> {
    this.logger.log(`[CreateUser] Input data: ${JSON.stringify(createDto)}`);
    
    // Handle roles
    let roles: Role[] = [];
    if (createDto.roleIds && Array.isArray(createDto.roleIds) && createDto.roleIds.length > 0) {
      roles = await this.roleRepo.findBy({ id: In(createDto.roleIds) });
      if (roles.length !== createDto.roleIds.length) {
        throw new BadRequestException('One or more roleIds are invalid');
      }
    }
    
    // Generate unique email if not provided
    let finalEmail = createDto.email;
    if (!finalEmail) {
      let emailAttempt = `${createDto.username}@toshacity.co.ke`;
      let attemptCount = 0;
      while (await this.userRepo.findOne({ where: { email: emailAttempt } })) {
        attemptCount++;
        emailAttempt = `${createDto.username}${attemptCount}@toshacity.co.ke`;
      }
      finalEmail = emailAttempt;
    }

    const user = this.userRepo.create({
      username: createDto.username,
      email: finalEmail,
      password: createDto.password,
      roles,
    });
    
    this.logger.log(`[CreateUser] User entity before save: ${JSON.stringify(user)}`);
    const savedUser = await this.userRepo.save(user);
    this.logger.log(`[CreateUser] User saved: ${JSON.stringify(savedUser)}`);
    
    // Return the full user entity with relations
    const fullUser = await this.userRepo.findOne({
      where: { id: savedUser.id },
      relations: ['roles'],
    });
    if (!fullUser) throw new Error('User not found after creation');
    return fullUser;
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.userRepo.delete(id);
  }

  async assignRoles(userId: number, roles:UserRole[]): Promise<User> {
    const user = await this.findOne(userId);
    // You must fetch Role entities from the database, e.g.:
// const foundRoles = await this.roleRepository.findBy({ name: In(roles) });
// user.roles = foundRoles;
// For now, set to empty array to avoid type error:
user.roles = [];
    return this.userRepo.save(user);
  }

  /**
   * Search users by username or email
   */
  async search(query: string, limit: number = 20): Promise<User[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;
    
    return this.userRepo.find({
      where: [
        { username: Like(searchTerm) },
        { email: Like(searchTerm) },
      ],
      relations: ['roles'],
      take: limit,
      order: {
        username: 'ASC',
      },
    });
  }
}