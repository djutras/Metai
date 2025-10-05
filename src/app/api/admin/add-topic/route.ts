import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { topics } from '../../../../../db/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { slug, name, query, includes, excludes, lang, freshnessHours, maxItems } = body;

    await db.insert(topics).values({
      slug,
      name,
      query: query || null,
      includes: includes || [],
      excludes: excludes || [],
      lang: lang || ['en'],
      freshnessHours: freshnessHours || 72,
      maxItems: maxItems || 30,
      enabled: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding topic:', error);
    return NextResponse.json({ error: 'Failed to add topic' }, { status: 500 });
  }
}
