import { PrismaClient } from '@prisma/client';
import { PERMISSION_DEFINITIONS, PermissionKey } from './permissions';
import { DEFAULT_ROLES } from './roles';
import { PermissionDefinition } from './authorization.types';

export class PermissionRegistry {
  private static permissionsMap = new Map<string, PermissionDefinition>(
    PERMISSION_DEFINITIONS.map((p) => [p.key, p])
  );

  static getAll(): PermissionDefinition[] {
    return PERMISSION_DEFINITIONS;
  }

  static get(key: string): PermissionDefinition | undefined {
    return this.permissionsMap.get(key);
  }

  static isValid(key: string): key is PermissionKey {
    return this.permissionsMap.has(key);
  }

  static getByCategory(): Record<string, PermissionDefinition[]> {
    const grouped: Record<string, PermissionDefinition[]> = {};
    for (const p of PERMISSION_DEFINITIONS) {
      if (!grouped[p.category]) {
        grouped[p.category] = [];
      }
      grouped[p.category].push(p);
    }
    return grouped;
  }

  /**
   * Syncs registered permissions and default roles with the database.
   * Safe and idempotent.
   */
  static async syncWithDatabase(prisma: PrismaClient): Promise<{
    permissionsSynced: number;
    rolesSynced: number;
  }> {
    // 1. Upsert all registered permissions
    for (const def of PERMISSION_DEFINITIONS) {
      await prisma.permission.upsert({
        where: { key: def.key },
        update: {
          name: def.name,
          description: def.description,
          resource: def.resource,
          action: def.action,
        },
        create: {
          key: def.key,
          name: def.name,
          description: def.description,
          resource: def.resource,
          action: def.action,
        },
      });
    }

    // Cache database permission records
    const dbPermissions = await prisma.permission.findMany();
    const permKeyToId = new Map(dbPermissions.map((p) => [p.key, p.id]));

    // 2. Upsert default system roles
    for (const roleDef of DEFAULT_ROLES) {
      const role = await prisma.role.upsert({
        where: { key: roleDef.key },
        update: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
        create: {
          key: roleDef.key,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
      });

      // Upsert default role permissions
      for (const permKey of roleDef.permissions) {
        const permId = permKeyToId.get(permKey);
        if (permId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permId,
            },
          });
        }
      }
    }

    return {
      permissionsSynced: PERMISSION_DEFINITIONS.length,
      rolesSynced: DEFAULT_ROLES.length,
    };
  }
}
