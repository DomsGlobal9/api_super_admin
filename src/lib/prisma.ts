import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

import { config } from './config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = globalForPrisma.pool ?? new Pool({ 
  connectionString: config.DATABASE_URL,
  max: 5, // Limit connections to prevent EMAXCONNSESSION (pool_size: 15)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);

// Use an existing instance in development to prevent connection exhaustion
// across hot reloads. In production, this simply creates a new instance.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
