import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database wipe (deleting all data)...');
  console.log('This will happen in dependency order to avoid errors.');
  
  // We must delete in the reverse order of creation to respect foreign key constraints.
  // Models that are "dependencies" of others must be deleted first.

  await prisma.report.deleteMany();
  console.log('- Emptied Report collection');
  
  await prisma.chatMessage.deleteMany();
  console.log('- Emptied ChatMessage collection');

  await prisma.notification.deleteMany();
  console.log('- Emptied Notification collection');

  await prisma.alert.deleteMany();
  console.log('- Emptied Alert collection');

  await prisma.maintenanceLog.deleteMany();
  console.log('- Emptied MaintenanceLog collection');
  
  await prisma.usageAnalytics.deleteMany();
  console.log('- Emptied UsageAnalytics collection');

  await prisma.departmentAnalytics.deleteMany();
  console.log('- Emptied DepartmentAnalytics collection');

  await prisma.sensorData.deleteMany();
  console.log('- Emptied SensorData collection');
  
  await prisma.equipmentStatus.deleteMany();
  console.log('- Emptied EquipmentStatus collection');
  
  await prisma.equipment.deleteMany();
  console.log('- Emptied Equipment collection');
  
  // Now we can delete models that other models depended on
  
  await prisma.user.deleteMany();
  console.log('- Emptied User collection');
  
  await prisma.lab.deleteMany();
  console.log('- Emptied Lab collection');

  await prisma.institute.deleteMany();
  console.log('- Emptied Institute collection');
  
  await prisma.oTP.deleteMany();
  console.log('- Emptied OTP collection');

  await prisma.systemConfig.deleteMany();
  console.log('- Emptied SystemConfig collection');

  console.log('---');
  console.log('Database wipe finished successfully.');
}

main()
  .catch((e) => {
    console.error('An error occurred during wipe:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });