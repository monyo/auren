import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { murmurs, users } from '@/lib/db/schema'
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

  const [row] = await db
    .select({
      id: murmurs.id,
      content: murmurs.content,
      authorId: murmurs.authorId,
      replyCount: murmurs.replyCount,
      upvoteCount: murmurs.upvoteCount,
      createdAt: murmurs.createdAt,
      contentEditedAt: murmurs.contentEditedAt,
      authorNickname: users.nickname,
      authorLevel: users.verificationLevel,
    })
    .from(murmurs)
    .innerJoin(users, eq(murmurs.authorId, users.id))
    .where(and(eq(murmurs.id, id), eq(murmurs.isPrivate, false), eq(murmurs.status, 'active')))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { authorId, ...rest } = row
  return NextResponse.json({ ...rest, isAuthor: userId === authorId })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [murmur] = await db
    .select({ authorId: murmurs.authorId })
    .from(murmurs)
    .where(eq(murmurs.id, id))
    .limit(1)
  if (!murmur) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (murmur.authorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })

  const contentEditedAt = new Date()
  await db.update(murmurs)
    .set({ content: content.trim(), contentEditedAt })
    .where(eq(murmurs.id, id))

  return NextResponse.json({ ok: true, contentEditedAt: contentEditedAt.toISOString() })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [murmur] = await db
    .select({ authorId: murmurs.authorId })
    .from(murmurs)
    .where(eq(murmurs.id, id))
    .limit(1)
  if (!murmur) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (murmur.authorId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.update(murmurs).set({ status: 'deleted' }).where(eq(murmurs.id, id))

  return NextResponse.json({ ok: true })
}
