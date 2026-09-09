import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedPositions } from './data/position.seed';
import { seedPermissions } from './data/permission.seed';
import { seedUsers } from './data/user.seed';
import { seedLocations } from './data/location.seed';
import { seedAnalysis } from './data/analysis.seed';
import { seedRdtr } from './rdtr.seed';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (Removed to avoid issues, relying on migrate reset instead)

  // Run seeders
  const { adminPosition, memberPosition } = await seedPositions(prisma);
  await seedPermissions(prisma, adminPosition.id, memberPosition.id);
  const { adminUser, memberUser, defaultPassword } = await seedUsers(
    prisma,
    adminPosition.id,
    memberPosition.id,
  );
  
  await seedLocations(prisma);
  await seedRdtr(prisma);
  await seedAnalysis(prisma, adminUser.id, memberUser.id);

  // Summary
  console.log('\n✨ Database seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`   - Positions: ${await prisma.position.count()}`);
  console.log(`   - Permissions: ${await prisma.permission.count()}`);
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Layers: ${await prisma.layer.count()}`);
  console.log(`   - Features: ${await prisma.feature.count()}`);
  console.log(`   - Analysis: ${await prisma.analysis.count()}`);
  console.log(
    `   - Position-Permission Links: ${await prisma.positionPermission.count()}\n`,
  );

  console.log('🔑 Default Users:');
  console.log(`   Admin: ${adminUser.email} / ${defaultPassword}`);
  console.log(`   Member: ${memberUser.email} / ${defaultPassword}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
