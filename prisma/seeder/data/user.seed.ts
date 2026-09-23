import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const seedUsers = async (
  prisma: PrismaClient,
  adminPositionId: number,
  memberPositionId: number,
) => {
  console.log('👥 Seeding users...');

  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kulidigital.com' },
    update: {},
    create: {
      email: 'admin@kulidigital.com',
      password: hashedPassword,
      position_id: adminPositionId,
      is_active: true,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@kulidigital.com' },
    update: {},
    create: {
      email: 'member@kulidigital.com',
      password: hashedPassword,
      position_id: memberPositionId,
      is_active: true,
    },
  });

  console.log('✅ Users seeded');

  return { adminUser, memberUser, defaultPassword };
};