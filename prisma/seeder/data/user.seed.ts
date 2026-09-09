import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const seedUsers = async (
  prisma: PrismaClient,
  adminPositionId: string,
  memberPositionId: string,
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
      fullname: 'Admin Kuli Digital',
      company_name: 'Kuli Digital',
      ip_address: '127.0.0.1',
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
      fullname: 'Member User',
      company_name: 'User Corp',
      ip_address: '127.0.0.2',
      position_id: memberPositionId,
      is_active: true,
    },
  });

  console.log('✅ Users seeded');

  return { adminUser, memberUser, defaultPassword };
};
