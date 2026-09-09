import { PrismaClient } from '@prisma/client';

export const seedPermissions = async (
  prisma: PrismaClient,
  adminPositionId: string,
  memberPositionId: string,
) => {
  console.log('🔐 Seeding permissions...');

  const permissionsData = [
    // User Management
    { name: 'VIEW_USER', resource: 'USER', action: 'VIEW', description: 'View user information' },
    { name: 'ADD_USER', resource: 'USER', action: 'ADD', description: 'Create new user' },
    { name: 'UPDATE_USER', resource: 'USER', action: 'UPDATE', description: 'Update user information' },
    { name: 'DELETE_USER', resource: 'USER', action: 'DELETE', description: 'Delete user' },
    { name: 'MANAGE_USER_PERMISSION', resource: 'USER', action: 'MANAGE_PERMISSION', description: 'Assign or revoke user permissions' },
    { name: 'CHANGE_USER_POSITION', resource: 'USER', action: 'CHANGE_POSITION', description: 'Change user position/role' },

    // Position Management
    { name: 'VIEW_POSITION', resource: 'POSITION', action: 'VIEW', description: 'View position information' },
    { name: 'ADD_POSITION', resource: 'POSITION', action: 'ADD', description: 'Create new position' },
    { name: 'UPDATE_POSITION', resource: 'POSITION', action: 'UPDATE', description: 'Update position information' },
    { name: 'DELETE_POSITION', resource: 'POSITION', action: 'DELETE', description: 'Delete position' },

    // Permission Management
    { name: 'VIEW_PERMISSION', resource: 'PERMISSION', action: 'VIEW', description: 'View permission information' },
    { name: 'ADD_PERMISSION', resource: 'PERMISSION', action: 'ADD', description: 'Create new permission' },
    { name: 'UPDATE_PERMISSION', resource: 'PERMISSION', action: 'UPDATE', description: 'Update permission information' },
    { name: 'DELETE_PERMISSION', resource: 'PERMISSION', action: 'DELETE', description: 'Delete permission' },

    // Location Management
    { name: 'VIEW_LOCATION', resource: 'LOCATION', action: 'VIEW', description: 'View locations' },
    { name: 'ADD_LOCATION', resource: 'LOCATION', action: 'ADD', description: 'Create new location' },
    { name: 'UPDATE_LOCATION', resource: 'LOCATION', action: 'UPDATE', description: 'Update location' },
    { name: 'DELETE_LOCATION', resource: 'LOCATION', action: 'DELETE', description: 'Delete location' },

    // Analysis Management
    { name: 'VIEW_ANALYSIS', resource: 'ANALYSIS', action: 'VIEW', description: 'View analysis' },
    { name: 'ADD_ANALYSIS', resource: 'ANALYSIS', action: 'ADD', description: 'Create new analysis' },
    { name: 'UPDATE_ANALYSIS', resource: 'ANALYSIS', action: 'UPDATE', description: 'Update analysis' },
    { name: 'DELETE_ANALYSIS', resource: 'ANALYSIS', action: 'DELETE', description: 'Delete analysis' },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission,
      })
    ),
  );

  console.log(`✅ ${permissions.length} permissions seeded`);

  // ============================================
  // Assign Permissions to Positions
  // ============================================
  console.log('🔗 Assigning permissions to positions...');

  // Admin gets all permissions
  const adminPermissions = permissions.map((permission) => ({
    position_id: adminPositionId,
    permission_id: permission.id,
  }));

  await prisma.positionPermission.createMany({
    data: adminPermissions,
    skipDuplicates: true,
  });

  // Member gets only basic viewing and analysis permissions
  const memberPermNames = [
    'VIEW_USER',
    'VIEW_LOCATION',
    'VIEW_ANALYSIS',
    'ADD_ANALYSIS',
    'UPDATE_ANALYSIS',
    'DELETE_ANALYSIS',
  ];
  const memberPerms = permissions
    .filter((p) => memberPermNames.includes(p.name))
    .map((p) => ({
      position_id: memberPositionId,
      permission_id: p.id,
    }));

  await prisma.positionPermission.createMany({
    data: memberPerms,
    skipDuplicates: true,
  });

  console.log('✅ Permissions assigned to positions');
};
