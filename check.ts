import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allTime = await prisma.requestLog.count();
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last24h = await prisma.requestLog.count({
    where: { timestamp: { gte: twentyFourHoursAgo } }
  });
  
  // Also check since midnight today
  const todayStart = new Date(new Date().setHours(0,0,0,0));
  const sinceMidnightLocal = await prisma.requestLog.count({
    where: { timestamp: { gte: todayStart } }
  });

  console.log('--- STATS ---');
  console.log('All Time Total:', allTime);
  console.log('Last 24 Hours:', last24h);
  console.log('Since Midnight Local (Server Time):', sinceMidnightLocal);
}

main().catch(console.error).finally(() => prisma.$disconnect());
