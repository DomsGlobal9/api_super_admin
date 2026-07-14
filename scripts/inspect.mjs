import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const logs = await prisma.requestLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 2
  });
  console.log(JSON.stringify(logs, null, 2));
}

main().finally(() => prisma.$disconnect());
