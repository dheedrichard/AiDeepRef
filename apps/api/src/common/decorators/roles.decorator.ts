/**
 * Roles Decorator
 *
 * Marks routes with required user roles for access control
 * Used with RolesGuard to enforce role-based access
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../database/entities';

export const ROLES_KEY = 'roles';

/**
 * Requires specific roles to access the endpoint
 * @param roles - Array of required roles
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Get('admin')
 * adminOnly() {
 *   return { message: 'Admin access granted' };
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators for common role requirements
export const AdminOnly = () => Roles(UserRole.ADMIN);
export const SeekerOnly = () => Roles(UserRole.SEEKER);
export const ReferrerOnly = () => Roles(UserRole.REFERRER);
export const AdminOrSuperAdmin = () => Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN);
