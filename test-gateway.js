const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const api = await prisma.microservice.findFirst({include: {apiVersions: {include: {endpoints: true}}}});
  const key = await prisma.apiKey.findFirst({
    include: { client: true }
  });
  console.log('Microservice:', api?.slug, 'Endpoints:', api?.apiVersions[0]?.endpoints.map(e => e.path));
  console.log('API Key:', key?.keyHash, 'Client:', key?.client?.companyName);
}

main().finally(() => prisma.$disconnect());
