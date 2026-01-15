import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../roles/entities/role.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or email' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (username or email)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results (default: 20)' })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.usersService.search(query, limit ? +limit : undefined);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user (admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(@Param('id') id: number, @Body() data: UpdateUserDto) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  async remove(@Param('id') id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/roles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign roles to user (admin only)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async assignRoles(@Param('id') id: number, @Body() body: AssignRolesDto) {
    return this.usersService.assignRoles(id, body.roles);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.usersService.update(req.user.userId, updateDto);
  }
}
