import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, users } from '@/lib/db/schema'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [row] = await db
    .select({
      id: murmurs.id,
      content: murmurs.content,
      replyCount: murmurs.replyCount,
      upvoteCount: murmurs.upvoteCount,
      createdAt: murmurs.createdAt,
      contentEditedAt: murmurs.contentEditedAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(murmurs)
    .innerJoin(users, eq(murmurs.authorId, users.id))
    .where(eq(murmurs.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}
