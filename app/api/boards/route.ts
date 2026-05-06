import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { boards } from '@/lib/db/schema'

export async function GET() {
  const rows = await db
    .select({
      id: boards.id,
      slug: boards.slug,
      name: boards.name,
      description: boards.description,
      postCount: boards.postCount,
    })
    .from(boards)
    .where(eq(boards.isActive, true))
    .orderBy(desc(boards.postCount))

  return NextResponse.json(rows)
}
