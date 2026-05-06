import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
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

  const [user] = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      verificationLevel: users.verificationLevel,
      dailyPostCount: users.dailyPostCount,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
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

  const { nickname } = await req.json()
  if (!nickname?.trim()) return NextResponse.json({ error: '暱稱不能為空' }, { status: 400 })
  if (nickname.trim().length > 20) return NextResponse.json({ error: '暱稱最多 20 字' }, { status: 400 })

  await db.update(users)
    .set({ nickname: nickname.trim(), nicknameChangedAt: new Date() })
    .where(eq(users.id, userId))

  return NextResponse.json({ ok: true })
}
