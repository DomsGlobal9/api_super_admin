import { prisma } from './src/lib/prisma';

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log('Admins:', users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
