import { PrismaClient, Environment } from '@prisma/client';
import { createHash } from 'crypto';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashApiKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@villy.co' },
    update: {},
    create: {
      email: 'admin@villy.co',
      passwordHash: 'not-needed-for-this-test', 
      name: 'System Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ SuperAdmin created: ${admin.id}`);

  const client = await prisma.client.upsert({
    where: { email: 'testclient@example.com' },
    update: {},
    create: {
      contactName: 'Test Client Alpha',
      email: 'testclient@example.com',
      companyName: 'Alpha Corp',
    },
  });
  console.log(`✅ Client created: ${client.id}`);

  const microservice = await prisma.microservice.upsert({
    where: { slug: 'tryon2buy' },
    update: {},
    create: {
      slug: 'tryon2buy',
      displayName: 'Virtual TryOn Service',
      description: 'AI draping for Shopify',
    },
  });
  console.log(`✅ Microservice created: ${microservice.id}`);

  const environment = await prisma.microserviceEnvironment.upsert({
    where: {
      microserviceId_environment: {
        microserviceId: microservice.id,
        environment: 'PRODUCTION',
      },
    },
    update: {
      targetUrl: 'http://localhost:4000', 
      healthEndpoint: '/api/v1/health',
      timeoutMs: 130000,
      retries: 0,
      maxPayloadSize: 26214400, 
      maxConcurrentRequests: 1000,
    },
    create: {
      microserviceId: microservice.id,
      environment: 'PRODUCTION',
      targetUrl: 'http://localhost:4000',
      healthEndpoint: '/api/v1/health',
      timeoutMs: 130000,
      retries: 0,
      maxPayloadSize: 26214400,
      maxConcurrentRequests: 1000,
    },
  });
  console.log(`✅ Environment created for PRODUCTION`);

  const access = await prisma.clientAccess.upsert({
    where: {
      clientId_microserviceId: {
        clientId: client.id,
        microserviceId: microservice.id,
      },
    },
    update: {
      enabled: true,
      rateLimit: 1000,
    },
    create: {
      clientId: client.id,
      microserviceId: microservice.id,
      enabled: true,
      rateLimit: 1000,
    },
  });
  console.log(`✅ ClientAccess granted`);

  const rawKey = 'test_api_key_123';
  const hashedKey = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash: hashedKey },
    update: {
      status: 'ACTIVE',
    },
    create: {
      clientId: client.id,
      keyHash: hashedKey,
      name: 'Test Alpha Key',
      status: 'ACTIVE',
      type: 'PRODUCTION',
    },
  });
  console.log(`✅ API Key created. Use header: x-api-key: ${rawKey}`);
  
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
