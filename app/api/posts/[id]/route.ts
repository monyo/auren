import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts, users, boards } from '@/lib/db/schema'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
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
  return NextResponse.json(row)
}
