import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, murmurUpvotes } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

async function getUser(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const payload = await verifySessionToken(token)
    return payload.userId
  } catch {
    return null
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ upvoted: false })

  const [row] = await db
    .select({ murmurId: murmurUpvotes.murmurId })
    .from(murmurUpvotes)
    .where(and(eq(murmurUpvotes.murmurId, id), eq(murmurUpvotes.userId, userId)))
    .limit(1)

  return NextResponse.json({ upvoted: !!row })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [existing] = await db
    .select({ murmurId: murmurUpvotes.murmurId })
    .from(murmurUpvotes)
    .where(and(eq(murmurUpvotes.murmurId, id), eq(murmurUpvotes.userId, userId)))
    .limit(1)

  if (existing) {
    await db.delete(murmurUpvotes).where(and(eq(murmurUpvotes.murmurId, id), eq(murmurUpvotes.userId, userId)))
    await db.update(murmurs).set({ upvoteCount: sql`GREATEST(${murmurs.upvoteCount} - 1, 0)` }).where(eq(murmurs.id, id))
    const [m] = await db.select({ upvoteCount: murmurs.upvoteCount }).from(murmurs).where(eq(murmurs.id, id)).limit(1)
    return NextResponse.json({ upvoted: false, upvoteCount: m?.upvoteCount ?? 0 })
  } else {
    await db.insert(murmurUpvotes).values({ murmurId: id, userId }).onConflictDoNothing()
    await db.update(murmurs).set({ upvoteCount: sql`${murmurs.upvoteCount} + 1` }).where(eq(murmurs.id, id))
    const [m] = await db.select({ upvoteCount: murmurs.upvoteCount }).from(murmurs).where(eq(murmurs.id, id)).limit(1)
    return NextResponse.json({ upvoted: true, upvoteCount: m?.upvoteCount ?? 0 })
  }
}
