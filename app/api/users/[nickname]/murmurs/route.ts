import { NextResponse } from 'next/server'
import { eq, and, lt, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

const PAGE_SIZE = 20

export async function GET(req: Request, { params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')

  // Find the target user
  const [targetUser] = await db
    .select({ id: users.id, nickname: users.nickname, verificationLevel: users.verificationLevel })
    .from(users)
    .where(eq(users.nickname, nickname))
    .limit(1)

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check if the requester is the owner (can see private murmurs)
  let isOwner = false
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    try {
      const payload = await verifySessionToken(token)
      isOwner = payload.userId === targetUser.id
    } catch { /* not authenticated */ }
  }

  const rows = await db
    .select({
      id: murmurs.id,
      content: murmurs.content,
      isPrivate: murmurs.isPrivate,
      replyCount: murmurs.replyCount,
      upvoteCount: murmurs.upvoteCount,
      createdAt: murmurs.createdAt,
    })
    .from(murmurs)
    .where(
      and(
        eq(murmurs.authorId, targetUser.id),
        eq(murmurs.status, 'active'),
        isOwner ? undefined : eq(murmurs.isPrivate, false),
        cursor ? lt(murmurs.id, cursor) : undefined,
      )
    )
    .orderBy(desc(murmurs.id))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    user: targetUser,
    items,
    nextCursor,
    isOwner,
  })
}
