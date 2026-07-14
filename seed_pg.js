require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Set search path to match Prisma's multi-schema if applicable
  await client.query('SET search_path TO super_admin, public');

  const hash = bcrypt.hashSync('password123', 10);
  
  await client.query(`
    INSERT INTO "AdminUser" (id, email, name, role, "passwordHash", "isActive", "updatedAt")
    VALUES ('admin_seed_1', 'admin@scaleeasy.com', 'Super Admin', 'SUPER_ADMIN', $1, true, NOW())
    ON CONFLICT (email) DO UPDATE SET "passwordHash" = $1, "isActive" = true;
  `, [hash]);
  
  console.log('Seeded admin: admin@scaleeasy.com');
  await client.end();
}

main().catch(console.error);
