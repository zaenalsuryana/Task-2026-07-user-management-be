import { PrismaClient } from '@prisma/client';

export const seedPositions = async (prisma: PrismaClient) => {
  console.log('📋 Seeding positions...');
  const adminPosition = await prisma.position.upsert({
    where: { name: 'kuldiadmin' },
    update: {},
    create: {
      name: 'kuldiadmin',
      description: 'Full system access with all permissions',
    },
  });

  const memberPosition = await prisma.position.upsert({
    where: { name: 'kuldimember' },
    update: {},
    create: {
      name: 'kuldimember',
      description: 'Standard user with limited permissions',
    },
  });

  console.log('✅ Positions seeded');
  return { adminPosition, memberPosition };
};
