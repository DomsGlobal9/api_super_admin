require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync('password123', 10);
  const user = await prisma.adminUser.upsert({
    where: { email: 'admin@scaleeasy.com' },
    update: { passwordHash: hash, isActive: true },
    create: {
      id: 'admin_seed_1',
      email: 'admin@scaleeasy.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: hash,
      isActive: true,
      status: 'ACTIVE'
    }
  });
  console.log('Seeded admin:', user.email);
}
main().catch(console.error).finally(() => prisma.$disconnect());
