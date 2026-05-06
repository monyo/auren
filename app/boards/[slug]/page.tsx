'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Board = {
  id: string
  slug: string
  name: string
  description: string | null
  postCount: number
  requiredLevel: string
}

type Post = {
  id: string
  title: string
  replyCount: number
  upvoteCount: number
  createdAt: string
  authorNickname: string
  authorLevel: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '剛剛'
  if (m < 60) return `${m} 分鐘前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小時前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

const LEVEL_COLOR: Record<string, string> = {
  level_4: 'text-[#F5A623]',
  level_3: 'text-[#58A6FF]',
  level_2: 'text-[#3FB950]',
  level_1: 'text-[#8B949E]',
}

export default function BoardPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  const [board, setBoard] = useState<Board | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingBoard, setLoadingBoard] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.replace('/verify')
  }, [router])

  useEffect(() => {
    fetch(`/api/boards/${slug}`)
      .then(r => r.json())
      .then(data => { setBoard(data); setLoadingBoard(false) })
      .catch(() => setLoadingBoard(false))
  }, [slug])

  const loadPosts = useCallback((cursor?: string) => {
    const url = cursor
      ? `/api/boards/${slug}/posts?cursor=${cursor}`
      : `/api/boards/${slug}/posts`
    return fetch(url).then(r => r.json())
  }, [slug])

  useEffect(() => {
    loadPosts().then(data => {
      setPosts(data.items ?? [])
      setNextCursor(data.nextCursor)
      setLoadingPosts(false)
    }).catch(() => setLoadingPosts(false))
  }, [loadPosts])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const data = await loadPosts(nextCursor)
    setPosts(prev => [...prev, ...(data.items ?? [])])
    setNextCursor(data.nextCursor)
    setLoadingMore(false)
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {loadingBoard ? (
          <div className="h-5 w-32 bg-[#21262D] rounded animate-pulse" />
        ) : (
          <h1 className="text-[16px] font-bold text-[#E6EDF3] truncate">{board?.name}</h1>
        )}
      </header>

      {/* Board info strip */}
      {!loadingBoard && board && (
        <div className="px-5 py-3 border-b border-[#21262D] flex-shrink-0">
          {board.description && (
            <p className="text-[13px] text-[#7D8590] mb-2 leading-relaxed">{board.description}</p>
          )}
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#484F58]">
              <strong className="text-[#7D8590]">{board.postCount.toLocaleString()}</strong> 篇文章
            </span>
          </div>
        </div>
      )}

      {/* Post list */}
      <div className="flex-1 overflow-y-auto pb-32">
        {loadingPosts ? (
          <div className="px-4 pt-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">還沒有文章</p>
            <p className="text-[13px] text-[#7D8590]">來發第一篇吧</p>
          </div>
        ) : (
          <div className="px-4 pt-3 space-y-2">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => router.push(`/boards/${slug}/posts/${post.id}`)}
                className="w-full text-left bg-[#161B22] border border-[#21262D] rounded-xl
                           p-4 hover:border-[#30363D] hover:bg-[#1C2128] transition-colors active:scale-[0.99]"
              >
                <p className="text-[14px] font-semibold text-[#E6EDF3] mb-2 leading-snug line-clamp-2">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-[#7D8590]">
                  <span className={`font-medium ${LEVEL_COLOR[post.authorLevel] ?? 'text-[#8B949E]'}`}>
                    {post.authorNickname}
                  </span>
                  <span>·</span>
                  <span>{timeAgo(post.createdAt)}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {post.replyCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                      </svg>
                      {post.upvoteCount}
                    </span>
                  </span>
                </div>
              </button>
            ))}

            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 text-[13px] text-[#7D8590] hover:text-[#E6EDF3]
                           transition-colors disabled:opacity-50"
              >
                {loadingMore ? '載入中...' : '載入更多'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* FAB — new post */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[500px] pointer-events-none z-10">
        <button
          onClick={() => router.push(`/boards/${slug}/new`)}
          className="absolute right-6 bottom-0 w-[52px] h-[52px] rounded-full bg-[#F5A623]
                     flex items-center justify-center shadow-[0_4px_20px_rgba(245,166,35,0.45)]
                     active:scale-95 transition-transform pointer-events-auto"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10
                      bg-[#161B22]/85 backdrop-blur-xl border border-white/[0.08]
                      rounded-full px-7 py-3 flex items-center gap-8
                      shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {[
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'search' },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.88"/></svg>, label: 'refresh' },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'messages' },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: 'settings' },
        ].map(({ icon, label }) => (
          <button key={label} className="text-[#E6EDF3]/35 hover:text-[#E6EDF3]/80 transition-colors">
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}
