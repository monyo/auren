import { NextResponse } from 'next/server'
import { eq, asc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { boards, posts, replies, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'
import { broadcast } from '@/lib/sse'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const rows = await db
    .select({
      id: replies.id,
      content: replies.content,
      upvoteCount: replies.upvoteCount,
      createdAt: replies.createdAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(replies)
    .innerJoin(users, eq(replies.authorId, users.id))
    .where(eq(replies.postId, id))
    .orderBy(asc(replies.id))

  return NextResponse.json(rows)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { content } = await req.json()
  if (!content?.trim())
    return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  const [post] = await db
    .select({ id: posts.id, boardSlug: boards.slug })
    .from(posts)
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(eq(posts.id, id))
    .limit(1)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [author] = await db
    .select({ nickname: users.nickname, verificationLevel: users.verificationLevel })
    .from(users).where(eq(users.id, userId)).limit(1)

  const replyId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await db.insert(replies).values({ id: replyId, postId: id, authorId: userId, content: content.trim() })
  await db.update(posts).set({ replyCount: sql`${posts.replyCount} + 1` }).where(eq(posts.id, id))

  const [updated] = await db.select({ replyCount: posts.replyCount }).from(posts).where(eq(posts.id, id)).limit(1)

  broadcast(`post:${id}`, 'reply', {
    id: replyId,
    content: content.trim(),
    upvoteCount: 0,
    createdAt,
    authorNickname: author?.nickname ?? '匿名',
    authorLevel: author?.verificationLevel ?? 'level_1',
  })
  broadcast(`board:${post.boardSlug}`, 'post_updated', {
    postId: id,
    replyCount: updated?.replyCount ?? 0,
  })

  return NextResponse.json({ id: replyId }, { status: 201 })
}
