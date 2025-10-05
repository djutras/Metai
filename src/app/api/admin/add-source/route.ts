import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sources } from '../../../../../db/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, domain, type } = body;

    await db.insert(sources).values({
      name,
      domain,
      type: type || 'custom_crawler',
      points: 0,
      enabled: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding source:', error);
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 });
  }
}
