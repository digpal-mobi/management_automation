import { PrismaClient } from '@prisma/client';
import { PERMISSION_DEFINITIONS, DEFAULT_ROLES } from '../src/authorization/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Synchronizing Permissions ---');
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
  console.log(`✓ Synchronized ${PERMISSION_DEFINITIONS.length} permissions.`);

  console.log('--- 2. Synchronizing System Roles & Permissions ---');
  const allDbPermissions = await prisma.permission.findMany();
  const permMap = new Map(allDbPermissions.map((p) => [p.key, p.id]));

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

    for (const pKey of roleDef.permissions) {
      const pId = permMap.get(pKey);
      if (pId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: pId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: pId,
          },
        });
      }
    }
    console.log(`✓ Role "${roleDef.name}" (${roleDef.key}) synced.`);
  }

  console.log('--- Database bootstrap complete. No seeded projects added. Clean slate for user projects. ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
