import * as dotenv from 'dotenv';
import fs from 'fs';
if (fs.existsSync('.env.local')) dotenv.config({ path: '.env.local' });
else dotenv.config({ path: '.env' });
import { prisma } from '../src/lib/prisma';

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
  console.table(clients.map((c: any) => ({
    company: c.companyName,
    logCount: c._count.requestLogs
  })));
  
  const apiKeys = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      requestCount: true,
      lastUsedAt: true,
      client: { select: { companyName: true } }
    },
    orderBy: { requestCount: 'desc' }
  });
  
  console.log('\nAPI Keys and their request counts:');
  console.table(apiKeys.map((k: any) => ({
    company: k.client.companyName,
    keyName: k.name,
    requestCount: k.requestCount,
    lastUsedAt: k.lastUsedAt
  })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
