import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.requestLog.count();
  console.log('Total logs in database:', count);
  
  const clients = await prisma.client.findMany({
    select: { 
      id: true, 
      companyName: true, 
      _count: { select: { requestLogs: true } } 
    }
  });
  
  console.log('Clients and their request log counts:');
  console.table(clients.map(c => ({
    company: c.companyName,
    logCount: c._count.requestLogs
  })));
  
  // If there are logs, get a breakdown by API
  if (count > 0) {
    const apiCounts = await prisma.requestLog.groupBy({
      by: ['microserviceId'],
      _count: true
    });
    console.log('Log count by microservice ID:', apiCounts);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
