import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Super Admin Gateway is awake and healthy!',
    timestamp: new Date().toISOString()
  });
}
