'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type BoardResult = {
  id: string
  slug: string
  name: string
  description: string | null
  postCount: number
}

type PostResult = {
  id: string
  title: string
  createdAt: string
  replyCount: number
  authorNickname: string
  boardSlug: string
  boardName: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '剛剛'
  if (m < 60) return `${m} 分鐘前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小時前`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d} 天前` : new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [boards, setBoards] = useState<BoardResult[]>([])
  const [posts, setPosts] = useState<PostResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/verify')
    inputRef.current?.focus()
  }, [router])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setBoards([]); setPosts([]); setSearched(false); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setBoards(data.boards ?? [])
      setPosts(data.posts ?? [])
      setLoading(false)
      setSearched(true)
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const hasResults = boards.length > 0 || posts.length > 0

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button onClick={() => router.back()} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1 flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484F58]">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋板塊或文章..."
            className="w-full h-10 bg-[#161B22] border border-[#21262D] rounded-xl
                       pl-9 pr-4 text-[14px] text-[#E6EDF3] placeholder:text-[#484F58]
                       focus:outline-none focus:border-[#F5A623] transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484F58] hover:text-[#8B949E]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3D444D] mb-4">
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-[14px] text-[#484F58]">搜尋板塊或文章標題</p>
          </div>
        ) : loading ? (
          <div className="px-4 pt-4 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-[#161B22] border border-[#21262D] rounded-xl animate-pulse" />)}
          </div>
        ) : !hasResults && searched ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">找不到結果</p>
            <p className="text-[13px] text-[#7D8590]">試試其他關鍵字</p>
          </div>
        ) : (
          <div className="pb-6">
            {boards.length > 0 && (
              <div>
                <p className="px-5 pt-4 pb-2 text-[11px] font-semibold text-[#3D444D] uppercase tracking-wider">板塊</p>
                <div className="px-4 space-y-2">
                  {boards.map(b => (
                    <button key={b.id} onClick={() => router.push(`/boards/${b.slug}`)}
                      className="w-full text-left bg-[#161B22] border border-[#21262D] rounded-xl p-4
                                 hover:border-[#30363D] hover:bg-[#1C2128] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] font-bold text-[#E6EDF3]">{b.name}</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3D444D]">
                          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {b.description && <p className="text-[12px] text-[#7D8590] truncate">{b.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {posts.length > 0 && (
              <div>
                <p className="px-5 pt-5 pb-2 text-[11px] font-semibold text-[#3D444D] uppercase tracking-wider">文章</p>
                <div className="px-4 space-y-2">
                  {posts.map(p => (
                    <button key={p.id} onClick={() => router.push(`/boards/${p.boardSlug}/posts/${p.id}`)}
                      className="w-full text-left bg-[#161B22] border border-[#21262D] rounded-xl p-4
                                 hover:border-[#30363D] hover:bg-[#1C2128] transition-colors">
                      <p className="text-[13px] font-semibold text-[#E6EDF3] mb-1.5 line-clamp-2">{p.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#484F58]">
                        <span className="text-[#7D8590]">{p.boardName}</span>
                        <span>·</span>
                        <span>{p.authorNickname}</span>
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
                        <span className="ml-auto flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          {p.replyCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
