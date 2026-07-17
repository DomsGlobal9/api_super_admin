import { prisma } from './src/lib/prisma';

async function main() {
  const apis = await prisma.microservice.findMany({ include: { apiVersions: true } });
  let fixed = 0;
  for (const api of apis) {
    if (api.apiVersions.length === 0) {
      await prisma.apiVersion.create({ data: { microserviceId: api.id, version: 'v1' } });
      fixed++;
    }
  }
  console.log('Fixed APIs: ' + fixed);
}

main().catch(console.error);
