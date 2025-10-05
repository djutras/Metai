import { db } from './db';
import { sources } from '../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';

/**
 * Bump source points by a delta
 */
export async function bumpSourcePoint(sourceId: number, delta = 1): Promise<void> {
  await db
    .update(sources)
    .set({
      points: sql`${sources.points} + ${delta}`,
    })
    .where(eq(sources.id, sourceId));
}

/**
 * Get sources ordered by points descending, then by creation date
 */
export async function getSourcesOrdered() {
  return db
    .select()
    .from(sources)
    .where(eq(sources.enabled, true))
    .orderBy(desc(sources.points), desc(sources.createdAt));
}

/**
 * Weekly decay: multiply all points by 0.6
 */
export async function weeklyDecay(): Promise<void> {
  await db
    .update(sources)
    .set({
      points: sql`GREATEST(0, FLOOR(${sources.points} * 0.6))`,
    });

  console.log('Weekly source points decay applied (multiplied by 0.6)');
}

/**
 * Get source by domain
 */
export async function getSourceByDomain(domain: string) {
  const result = await db
    .select()
    .from(sources)
    .where(eq(sources.domain, domain))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update source last seen timestamp
 */
export async function updateSourceLastSeen(sourceId: number): Promise<void> {
  await db
    .update(sources)
    .set({
      lastSeenAt: new Date(),
    })
    .where(eq(sources.id, sourceId));
}
