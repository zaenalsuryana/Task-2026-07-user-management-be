import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const seedLocations = async (prisma: PrismaClient) => {
  console.log('📍 Seeding layers and features from JSON data...');

  // Create Layers
  const residentialAptLayer = await prisma.layer.upsert({
    where: { name_category: { name: 'Residential', category: 'Apartment' } },
    update: {},
    create: { name: 'Residential', category: 'Apartment', description: 'Real estate properties and developments' },
  });

  const residentialLandedLayer = await prisma.layer.upsert({
    where: { name_category: { name: 'Residential', category: 'Landed House' } },
    update: {},
    create: { name: 'Residential', category: 'Landed House', description: 'Real estate properties and developments' },
  });

  const retailLayer = await prisma.layer.upsert({
    where: { name_category: { name: 'Retail', category: 'Shopping Mall' } },
    update: {},
    create: { name: 'Retail', category: 'Shopping Mall', description: 'Retail stores and commercial centers' },
  });

  const hospitalityLayer = await prisma.layer.upsert({
    where: { name_category: { name: 'Hospitality', category: 'Dental' } },
    update: {},
    create: { name: 'Hospitality', category: 'Dental', description: 'Dental clinics and care centers' },
  });

  const transportationLayer = await prisma.layer.upsert({
    where: { name_category: { name: 'Transportation', category: 'Railway Station' } },
    update: {},
    create: { name: 'Transportation', category: 'Railway Station', description: 'KAI Railway Stations and Infrastructure' },
  });

  // Delete existing features for these layers to avoid duplicates on re-seed
  await prisma.feature.deleteMany({
    where: { layer_id: { in: [residentialAptLayer.id, residentialLandedLayer.id, retailLayer.id, hospitalityLayer.id, transportationLayer.id] } }
  });

  const fileLayerMapping = [
    { file: 'units_data_1.json', layerId: residentialAptLayer.id },
    { file: 'units_data_2.json', layerId: residentialLandedLayer.id },
    { file: 'units_data_3.json', layerId: retailLayer.id },
    { file: 'units_data_4.json', layerId: hospitalityLayer.id },
    { file: 'Bandung.geojson', layerId: transportationLayer.id },
    { file: 'Semarang.geojson', layerId: transportationLayer.id },
    { file: 'Sumatera_Barat.geojson', layerId: transportationLayer.id },
    { file: 'Surabaya.geojson', layerId: transportationLayer.id },
  ];

  let totalSeeded = 0;

  for (const { file, layerId } of fileLayerMapping) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${file}`);
      continue;
    }

    console.log(`Loading data from ${file}...`);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    
    const isGeoJson = parsedData.type === 'FeatureCollection';
    const locations = isGeoJson ? parsedData.features : parsedData;

    for (const location of locations) {
      const isFeature = isGeoJson;
      const props = isFeature ? location.properties : location;
      const lat = parseFloat(props.latitude);
      const lon = parseFloat(props.longitude);
      
      const feature = await prisma.feature.create({
        data: {
          layer_id: layerId,
          name: props.property_name || props.alias || props.name || props.namaTempat || 'Unknown Property',
          properties: props,
        },
      });

      if (isFeature && location.geometry) {
        const geometryString = JSON.stringify(location.geometry);
        await prisma.$executeRawUnsafe(`
          UPDATE features 
          SET geom = ST_SetSRID(ST_GeomFromGeoJSON('${geometryString}'), 4326) 
          WHERE id = '${feature.id}'
        `);
      } else if (!isNaN(lat) && !isNaN(lon)) {
        // Populate PostGIS geom for point data
        await prisma.$executeRawUnsafe(`
          UPDATE features 
          SET geom = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) 
          WHERE id = '${feature.id}'
        `);
      }
      totalSeeded++;
    }
  }

  console.log(`✅ ${totalSeeded} Features seeded and PostGIS indexed`);
};
