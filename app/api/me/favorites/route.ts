import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userFavoriteBoards, boards } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const rows = await db
    .select({
      id: boards.id,
      slug: boards.slug,
      name: boards.name,
      description: boards.description,
      postCount: boards.postCount,
    })
    .from(userFavoriteBoards)
    .innerJoin(boards, eq(userFavoriteBoards.boardId, boards.id))
    .where(eq(userFavoriteBoards.userId, userId))
    .orderBy(userFavoriteBoards.sortOrder)

  return NextResponse.json(rows)
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

  const { boardId } = await req.json()
  if (!boardId) return NextResponse.json({ error: 'boardId required' }, { status: 400 })

  await db.insert(userFavoriteBoards)
    .values({ userId, boardId })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { order } = await req.json() as { order: string[] }
  if (!Array.isArray(order)) return NextResponse.json({ error: 'order required' }, { status: 400 })

  await Promise.all(
    order.map((boardId, idx) =>
      db.update(userFavoriteBoards)
        .set({ sortOrder: idx })
        .where(and(eq(userFavoriteBoards.userId, userId), eq(userFavoriteBoards.boardId, boardId)))
    )
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    const payload = await verifySessionToken(token)
    userId = payload.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { boardId } = await req.json()
  await db.delete(userFavoriteBoards)
    .where(and(eq(userFavoriteBoards.userId, userId), eq(userFavoriteBoards.boardId, boardId)))

  return NextResponse.json({ ok: true })
}
