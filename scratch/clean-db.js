const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.requestLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.apiEndpoint.deleteMany();
  await prisma.apiVersion.deleteMany();
  await prisma.microserviceEnvironment.deleteMany();
  await prisma.clientAccess.deleteMany();
  await prisma.microservice.deleteMany();
  await prisma.client.deleteMany();
  console.log('Successfully cleared all API and Client data!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
