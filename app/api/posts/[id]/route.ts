import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts, users, boards } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'
import { broadcast } from '@/lib/sse'

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

  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      authorId: posts.authorId,
      replyCount: posts.replyCount,
      upvoteCount: posts.upvoteCount,
      createdAt: posts.createdAt,
      contentEditedAt: posts.contentEditedAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
      boardSlug: boards.slug,
      boardName: boards.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .innerJoin(boards, eq(posts.boardId, boards.id))
    .where(eq(posts.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { authorId, ...rest } = row
  return NextResponse.json({ ...rest, isAuthor: userId === authorId })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [post] = await db
    .select({ authorId: posts.authorId, boardId: posts.boardId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.authorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  const contentEditedAt = new Date()
  await db.update(posts)
    .set({ content: content.trim(), contentEditedAt })
    .where(eq(posts.id, id))

  const [board] = await db.select({ slug: boards.slug }).from(boards).where(eq(boards.id, post.boardId)).limit(1)
  if (board) broadcast(`board:${board.slug}`, 'post_updated', { postId: id })

  return NextResponse.json({ ok: true, contentEditedAt: contentEditedAt.toISOString() })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [post] = await db
    .select({ authorId: posts.authorId, boardId: posts.boardId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.authorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.update(posts).set({ status: 'deleted' }).where(eq(posts.id, id))

  const [board] = await db
    .select({ id: boards.id, slug: boards.slug })
    .from(boards)
    .where(eq(boards.id, post.boardId))
    .limit(1)
  if (board) {
    await db.update(boards)
      .set({ postCount: sql`GREATEST(${boards.postCount} - 1, 0)` })
      .where(eq(boards.id, board.id))
    broadcast(`board:${board.slug}`, 'post_deleted', { postId: id })
  }

  return NextResponse.json({ ok: true })
}
