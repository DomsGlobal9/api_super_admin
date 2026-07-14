import { config } from 'dotenv';
config();

import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

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
      isActive: true
    }
  });
  console.log('Seeded admin:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
