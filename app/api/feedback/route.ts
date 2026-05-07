import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { db } from '@/lib/db'
import { feedback } from '@/lib/db/schema'
import { verifySessionToken } from '@/lib/auth/session'

const VALID_CATEGORIES = ['bug', 'feature', 'other', 'general'] as const

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  let userId: string | null = null
  if (token) {
    try {
      const payload = await verifySessionToken(token)
      userId = payload.userId
    } catch { /* anonymous feedback is fine */ }
  }

  const { content, category } = await req.json().catch(() => ({}))
  if (!content?.trim()) return NextResponse.json({ error: '內容不能為空' }, { status: 400 })
  if (content.trim().length > 2000) return NextResponse.json({ error: '內容最多 2000 字' }, { status: 400 })

  const cat = VALID_CATEGORIES.includes(category) ? category : 'general'

  await db.insert(feedback).values({
    id: uuidv7(),
    userId,
    content: content.trim(),
    category: cat,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}

// Simple admin read — protect with a secret header in production
export async function GET(req: Request) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(200)

  return NextResponse.json(rows)
}
