import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { apiService } from '@/features/apis/api.service';

export async function GET() {
  try {
    const overview = await apiService.getApiOverview('006d502e-ee8c-4686-9941-9f5c0948d688');
    return NextResponse.json({ overview, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, success: false });
  }
}
