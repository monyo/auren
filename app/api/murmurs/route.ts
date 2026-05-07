import { NextResponse } from 'next/server'
import { desc, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'
import { eq, and } from 'drizzle-orm'

const PAGE_SIZE = 20

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')

  const rows = await db
    .select({
      id: murmurs.id,
      content: murmurs.content,
      replyCount: murmurs.replyCount,
      upvoteCount: murmurs.upvoteCount,
      createdAt: murmurs.createdAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(murmurs)
    .innerJoin(users, eq(murmurs.authorId, users.id))
    .where(
      and(
        eq(murmurs.status, 'active'),
        eq(murmurs.isPrivate, false),
        cursor ? lt(murmurs.id, cursor) : undefined,
      )
    )
    .orderBy(desc(murmurs.id))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ items, nextCursor })
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { content, isPrivate } = await req.json()
  if (!content?.trim())
    return NextResponse.json({ error: '內容不能為空' }, { status: 400 })
  if (content.trim().length > 500)
    return NextResponse.json({ error: 'Murmur 最多 500 字' }, { status: 400 })

  const id = crypto.randomUUID()
  await db.insert(murmurs).values({ id, authorId: userId, content: content.trim(), isPrivate: isPrivate === true })

  return NextResponse.json({ id }, { status: 201 })
}
