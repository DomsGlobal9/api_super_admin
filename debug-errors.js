require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.requestLog.findMany({
    where: {
      statusCode: 500,
      endpoint: '/api/external/tryon'
    },
    orderBy: { timestamp: 'desc' },
    take: 5,
    select: {
      timestamp: true,
      statusCode: true,
      totalLatencyMs: true,
      errorCode: true,
      errorMessage: true,
      gatewayInstance: true,
    }
  });
  
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
