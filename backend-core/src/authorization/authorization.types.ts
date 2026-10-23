export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  isSystemProtected?: boolean;
}

export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface UserEffectivePermissions {
  userId: string;
  isSystemAdmin: boolean;
  systemRoles: string[];
  projectRoles: string[];
  permissions: string[];
}

export interface AuthCheckResult {
  authorized: boolean;
  reason?: string;
  status?: number;
}
