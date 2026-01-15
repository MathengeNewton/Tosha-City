import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.debug(`Searching for user: ${username}`);
    
    // Search by both username and email
    const user = await this.userRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.username = :username OR user.email = :email', {
        username,
        email: username
      })
      .addSelect('user.password') // Explicitly select password for comparison
      .getOne();

    if (user && await bcrypt.compare(password, user.password)) {
      this.logger.debug(`Password matched for user: ${user.username}`);
      const { password, ...result } = user;
      return result;
    }
    
    this.logger.warn(`User not found or invalid password for: ${username}`);
    return null;
  }

  // Example method: issue JWT
  async login(user: any) {
    const payload = { username: user.username, sub: user.id, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
        email: user.email,
        // Add other fields as needed
      },
    };
  }

  async register(username: string, password: string, roles: string[]) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepo.create({ username, password: hashedPassword, roles: roles.map(role => ({ name: role })) });
    return this.userRepo.save(newUser);
  }

  async resetPassword(usernameOrEmail: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ 
      where: [ 
        { username: usernameOrEmail }, 
        { email: usernameOrEmail } 
      ] 
    });
    if (!user) {
      throw new Error('User not found');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await this.userRepo.save(user);
    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      select: ['id', 'password', 'username', 'email'],
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepo.save(user);
    
    return { message: 'Password changed successfully' };
  }
}
