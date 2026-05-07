import { NextResponse } from 'next/server'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, murmurReplies, users } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const rows = await db
    .select({
      id: murmurReplies.id,
      content: murmurReplies.content,
      createdAt: murmurReplies.createdAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(murmurReplies)
    .innerJoin(users, eq(murmurReplies.authorId, users.id))
    .where(eq(murmurReplies.murmurId, id))
    .orderBy(desc(murmurReplies.id))

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
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  const [murmur] = await db.select({ id: murmurs.id }).from(murmurs).where(eq(murmurs.id, id)).limit(1)
  if (!murmur) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const replyId = crypto.randomUUID()
  await db.insert(murmurReplies).values({ id: replyId, murmurId: id, authorId: userId, content: content.trim() })
  await db.update(murmurs).set({ replyCount: sql`${murmurs.replyCount} + 1` }).where(eq(murmurs.id, id))

  return NextResponse.json({ id: replyId }, { status: 201 })
}
