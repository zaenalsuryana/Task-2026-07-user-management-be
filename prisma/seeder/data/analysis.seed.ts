import { PrismaClient } from '@prisma/client';

export const seedAnalysis = async (
  prisma: PrismaClient,
  adminUserId: string,
  memberUserId: string,
) => {
  console.log('📈 Seeding analysis...');

  // Get layers created in location.seed.ts
  const residentialLayer = await prisma.layer.findFirst({ where: { name: 'Residential' } });

  if (!residentialLayer) {
    console.log('⚠️ Skipping analysis seeding: Layers not found (run location seeder first)');
    return;
  }

  // Clear existing analysis
  await prisma.analysis.deleteMany({});

  const analysesData = [
    {
      user_id: adminUserId,
      title: 'Retail Search - Jakarta (5km)',
      layer_id: residentialLayer.id,
      latitude: -6.2000,
      longitude: 106.8166,
      radius_m: 5000,
    },
    {
      user_id: adminUserId,
      title: 'Real Estate Search - Bandung (10km)',
      layer_id: residentialLayer.id,
      latitude: -6.9175,
      longitude: 107.6191,
      radius_m: 10000,
    },
    {
      user_id: memberUserId,
      title: 'Retail Search - Kemang (3km)',
      layer_id: residentialLayer.id,
      latitude: -6.2625,
      longitude: 106.8166,
      radius_m: 3000,
    }
  ];

  await prisma.analysis.createMany({
    data: analysesData,
  });

  console.log('✅ Analysis seeded');
};
