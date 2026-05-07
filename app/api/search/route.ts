import { NextResponse } from 'next/server'
import { ilike, or, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { boards, posts, users } from '@/lib/db/schema'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json({ boards: [], posts: [] })

  const pattern = `%${q}%`

  const [matchedBoards, matchedPosts] = await Promise.all([
    db.select({
      id: boards.id,
      slug: boards.slug,
      name: boards.name,
      description: boards.description,
      postCount: boards.postCount,
    })
      .from(boards)
      .where(or(ilike(boards.name, pattern), ilike(boards.description, pattern)))
      .limit(5),

    db.select({
      id: posts.id,
      title: posts.title,
      createdAt: posts.createdAt,
      replyCount: posts.replyCount,
      authorNickname: users.nickname,
      boardSlug: boards.slug,
      boardName: boards.name,
    })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(boards, eq(posts.boardId, boards.id))
      .where(or(ilike(posts.title, pattern), ilike(posts.content, pattern)))
      .orderBy(desc(posts.id))
      .limit(10),
  ])

  return NextResponse.json({ boards: matchedBoards, posts: matchedPosts })
}
