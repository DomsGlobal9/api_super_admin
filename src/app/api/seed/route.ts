import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Environment } from '@prisma/client';
import { createHash } from 'crypto';

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function GET() {
  try {
    console.log('🌱 Starting database seed via API...');

    const admin = await prisma.superAdmin.upsert({
      where: { email: 'admin@villy.co' },
      update: {},
      create: {
        email: 'admin@villy.co',
        passwordHash: 'not-needed-for-this-test', 
        name: 'System Admin',
      },
    });

    const client = await prisma.client.upsert({
      where: { email: 'testclient@example.com' },
      update: {},
      create: {
        name: 'Test Client Alpha',
        email: 'testclient@example.com',
        company: 'Alpha Corp',
      },
    });

    const microservice = await prisma.microservice.upsert({
      where: { slug: 'tryon2buy' },
      update: {},
      create: {
        slug: 'tryon2buy',
        displayName: 'Virtual TryOn Service',
        description: 'AI draping for Shopify',
      },
    });

    const environment = await prisma.microserviceEnvironment.upsert({
      where: {
        microserviceId_environment: {
          microserviceId: microservice.id,
          environment: Environment.PRODUCTION,
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
        environment: Environment.PRODUCTION,
        targetUrl: 'http://localhost:4000',
        healthEndpoint: '/api/v1/health',
        timeoutMs: 130000,
        retries: 0,
        maxPayloadSize: 26214400, 
        maxConcurrentRequests: 1000,
      },
    });

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
    
    return NextResponse.json({ message: 'Seeding complete!', rawKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
