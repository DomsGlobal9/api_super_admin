import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, serverError } from '@/lib/api/response';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const settings = await prisma.systemSetting.findMany();
    
    // Convert array of {key, value} to a flat object
    const settingsObject = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return ok(settingsObject);
  } catch (error: any) {
    console.error(`GET /settings Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const adminUserId = (session.user as any).id;

    // Process each key-value pair and upsert in the database
    const upsertPromises = Object.entries(body).map(([key, value]) => {
      return prisma.systemSetting.upsert({
        where: { key },
        update: { 
          value: value as any, 
          updatedByUserId: adminUserId 
        },
        create: { 
          key, 
          value: value as any, 
          updatedByUserId: adminUserId 
        },
      });
    });

    await Promise.all(upsertPromises);

    return ok({ message: "Settings updated successfully" });
  } catch (error: any) {
    console.error(`PATCH /settings Error:`, error);
    return serverError('INTERNAL_ERROR', error.message);
  }
}
