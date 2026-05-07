import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts, postUpvotes } from '@/lib/db/schema'
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
    .select({ postId: postUpvotes.postId })
    .from(postUpvotes)
    .where(and(eq(postUpvotes.postId, id), eq(postUpvotes.userId, userId)))
    .limit(1)

  return NextResponse.json({ upvoted: !!row })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [existing] = await db
    .select({ postId: postUpvotes.postId })
    .from(postUpvotes)
    .where(and(eq(postUpvotes.postId, id), eq(postUpvotes.userId, userId)))
    .limit(1)

  if (existing) {
    await db.delete(postUpvotes).where(and(eq(postUpvotes.postId, id), eq(postUpvotes.userId, userId)))
    await db.update(posts).set({ upvoteCount: sql`GREATEST(${posts.upvoteCount} - 1, 0)` }).where(eq(posts.id, id))
    const [post] = await db.select({ upvoteCount: posts.upvoteCount }).from(posts).where(eq(posts.id, id)).limit(1)
    return NextResponse.json({ upvoted: false, upvoteCount: post?.upvoteCount ?? 0 })
  } else {
    await db.insert(postUpvotes).values({ postId: id, userId }).onConflictDoNothing()
    await db.update(posts).set({ upvoteCount: sql`${posts.upvoteCount} + 1` }).where(eq(posts.id, id))
    const [post] = await db.select({ upvoteCount: posts.upvoteCount }).from(posts).where(eq(posts.id, id)).limit(1)
    return NextResponse.json({ upvoted: true, upvoteCount: post?.upvoteCount ?? 0 })
  }
}
