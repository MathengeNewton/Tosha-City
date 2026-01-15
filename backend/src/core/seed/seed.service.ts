import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/roles/entities/role.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedAdminUser();
  }

  private async seedRoles() {
    const roles = Object.values(UserRole);
    for (const name of roles) {
      const exists = await this.roleRepo.findOne({ where: { name } });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create({ name }));
        this.logger.log(`Seeded role: ${name}`);
      }
    }
  }

  private async seedAdminUser() {
    const adminExists = await this.userRepo.findOne({
      where: { username: 'admin' },
    });
    if (!adminExists) {
      const adminRole = await this.roleRepo.findOne({
        where: { name: UserRole.ADMIN },
      });
      if (!adminRole) {
        throw new Error('Admin role not found! Did you seed roles first?');
      }
      
      const user = this.userRepo.create({
        username: 'admin',
        email: 'admin@toshacity.local',
        password: await bcrypt.hash('admin123', 10),
        roles: [adminRole],
      });
      await this.userRepo.save(user);
      this.logger.log('Seeded admin user');
    }
  }
}
