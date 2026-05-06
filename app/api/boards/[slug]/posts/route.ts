import { NextResponse } from 'next/server'
import { eq, lt, desc, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { boards, posts, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

const PAGE_SIZE = 20

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor') // last post id from previous page

  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.slug, slug))
    .limit(1)

  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      replyCount: posts.replyCount,
      upvoteCount: posts.upvoteCount,
      createdAt: posts.createdAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        eq(posts.boardId, board.id),
        eq(posts.status, 'active'),
        cursor ? lt(posts.id, cursor) : undefined,
      )
    )
    .orderBy(desc(posts.id))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ items, nextCursor })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { title, content } = await req.json()
  if (!title?.trim() || !content?.trim())
    return NextResponse.json({ error: '標題和內容不能為空' }, { status: 400 })
  if (title.trim().length > 200)
    return NextResponse.json({ error: '標題最多 200 字' }, { status: 400 })

  const [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.slug, slug))
    .limit(1)
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const id = crypto.randomUUID()
  await db.insert(posts).values({
    id,
    boardId: board.id,
    authorId: userId,
    title: title.trim(),
    content: content.trim(),
  })
  await db.update(boards).set({ postCount: sql`${boards.postCount} + 1` }).where(eq(boards.id, board.id))

  return NextResponse.json({ id }, { status: 201 })
}
