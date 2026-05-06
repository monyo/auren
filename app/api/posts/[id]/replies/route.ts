import { NextResponse } from 'next/server'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts, replies, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

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
    .orderBy(desc(replies.id))

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

  const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const replyId = crypto.randomUUID()
  await db.insert(replies).values({ id: replyId, postId: id, authorId: userId, content: content.trim() })
  await db.update(posts).set({ replyCount: sql`${posts.replyCount} + 1` }).where(eq(posts.id, id))

  return NextResponse.json({ id: replyId }, { status: 201 })
}
