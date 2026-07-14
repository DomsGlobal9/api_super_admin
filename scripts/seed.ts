import { Environment } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../src/lib/prisma';

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create a Super Admin
  const admin = await prisma.superAdmin.upsert({
    where: { email: 'admin@villy.co' },
    update: {},
    create: {
      email: 'admin@villy.co',
      passwordHash: 'not-needed-for-this-test', // Mock
      name: 'System Admin',
    },
  });
  console.log(`✅ SuperAdmin created: ${admin.id}`);

  // 2. Create a Client
  const client = await prisma.client.upsert({
    where: { email: 'testclient@example.com' },
    update: {},
    create: {
      name: 'Test Client Alpha',
      email: 'testclient@example.com',
      company: 'Alpha Corp',
    },
  });
  console.log(`✅ Client created: ${client.id}`);

  // 3. Create a Microservice (tryon2buy)
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

  // 4. Create MicroserviceEnvironment (PRODUCTION)
  // We'll point it to the local Express backend on port 4000
  const environment = await prisma.microserviceEnvironment.upsert({
    where: {
      microserviceId_environment: {
        microserviceId: microservice.id,
        environment: Environment.PRODUCTION,
      },
    },
    update: {
      targetUrl: 'http://localhost:4000', // Our TryOn Backend
      healthEndpoint: '/api/v1/health',
      timeoutMs: 130000,
      retries: 0,
      maxPayloadSize: 26214400, // 25MB
      maxConcurrentRequests: 1000,
    },
    create: {
      microserviceId: microservice.id,
      environment: Environment.PRODUCTION,
      targetUrl: 'http://localhost:4000',
      healthEndpoint: '/api/v1/health',
      timeoutMs: 130000,
      retries: 0,
      maxPayloadSize: 26214400, // 25MB
      maxConcurrentRequests: 1000,
    },
  });
  console.log(`✅ Environment created for ${Environment.PRODUCTION}`);

  // 5. Create ClientAccess
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

  // 6. Create an API Key (raw: test_api_key_123)
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
      environment: Environment.PRODUCTION,
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
