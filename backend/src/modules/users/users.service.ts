import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Role } from '../roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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

    let roles: Role[] = [];
    if (createDto.roleIds && Array.isArray(createDto.roleIds) && createDto.roleIds.length > 0) {
      roles = await this.roleRepo.findBy({ id: In(createDto.roleIds) });
      if (roles.length !== createDto.roleIds.length) {
        throw new BadRequestException('One or more roleIds are invalid');
      }
    }

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

    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    const user = this.userRepo.create({
      username: createDto.username,
      email: finalEmail,
      password: hashedPassword,
      roles,
    });

    const savedUser = await this.userRepo.save(user);
    const fullUser = await this.userRepo.findOne({
      where: { id: savedUser.id },
      relations: ['roles'],
    });
    if (!fullUser) throw new Error('User not found after creation');
    return fullUser;
  }

  async update(
    id: number,
    data: Partial<Pick<User, 'username' | 'email' | 'password'>> & { roleIds?: number[] },
  ): Promise<User> {
    const { roleIds, ...rest } = data;
    const updateData = { ...rest } as Partial<User>;
    const user = await this.findOne(id);

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (roleIds !== undefined) {
      const roles = await this.roleRepo.findBy({ id: In(roleIds) });
      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more roleIds are invalid');
      }
      user.roles = roles;
    }

    Object.assign(user, updateData);
    await this.userRepo.save(user);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.userRepo.delete(id);
  }

  async assignRoles(userId: number, roles: UserRole[]): Promise<User> {
    const user = await this.findOne(userId);
    const foundRoles = await this.roleRepo.findBy({ name: In(roles) });
    user.roles = foundRoles;
    return this.userRepo.save(user);
  }

  async search(query: string, limit: number = 20): Promise<User[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;

    return this.userRepo.find({
      where: [{ username: Like(searchTerm) }, { email: Like(searchTerm) }],
      relations: ['roles'],
      loadEagerRelations: true,
      take: limit,
      order: { username: 'ASC' },
    });
  }
}
