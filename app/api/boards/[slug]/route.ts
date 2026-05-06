import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { boards } from '@/lib/db/schema'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const [board] = await db
    .select({
      id: boards.id,
      slug: boards.slug,
      name: boards.name,
      description: boards.description,
      postCount: boards.postCount,
      requiredLevel: boards.requiredLevel,
    })
    .from(boards)
    .where(eq(boards.slug, slug))
    .limit(1)

  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(board)
}
