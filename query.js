require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = '006d502e-ee8c-4686-9941-9f5c0948d688';
  
  const top = await prisma.requestLog.groupBy({
    by: ['endpoint', 'method'],
    where: { microserviceId: id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });
  console.log('Grouped Top Endpoints:', JSON.stringify(top, null, 2));

  const total = await prisma.requestLog.count({ where: { microserviceId: id }});
  console.log('Total Logs for this MS:', total);
}

main().catch(console.error).finally(() => prisma.$disconnect());
