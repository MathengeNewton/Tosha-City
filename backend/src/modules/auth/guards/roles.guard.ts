// src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorator';
import { UserRole } from '../../roles/entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger('RolesGuard');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ANSI color codes
    const colorGreen = '\x1b[32m';
    const colorRed = '\x1b[31m';
    const colorYellow = '\x1b[33m';
    const colorReset = '\x1b[0m';

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      this.logger.log(`${colorYellow}[RolesGuard] No roles required for this endpoint.${colorReset}`);
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    this.logger.log(`${colorYellow}[RolesGuard] Required roles: ${JSON.stringify(requiredRoles)}${colorReset}`);
    this.logger.log(`${colorYellow}[RolesGuard] User info: ${user ? JSON.stringify({ username: user.username, roles: user.roles }) : 'No user'}${colorReset}`);
    if (!user || !user.roles) {
      this.logger.error(`${colorRed}[RolesGuard] No user roles found. Access denied.${colorReset}`);
      throw new ForbiddenException('No user roles found');
    }

    // Map user.roles to role names if roles are objects
    const userRoleNames = user.roles.map((r: any) => typeof r === 'string' ? r : r.name);
    const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));
    if (!hasRole) {
      this.logger.error(`${colorRed}[RolesGuard] Access denied. User roles: ${JSON.stringify(user.roles)}, Required: ${JSON.stringify(requiredRoles)}${colorReset}`);
      throw new ForbiddenException('Insufficient permissions');
    }
    this.logger.log(`${colorGreen}[RolesGuard] Access granted. User roles: ${JSON.stringify(user.roles)}, Required: ${JSON.stringify(requiredRoles)}${colorReset}`);
    return true;
  }
}