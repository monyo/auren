'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'

type Tab = 'favorites' | 'popular' | 'map' | 'murmurs'

type Board = {
  id: string
  slug: string
  name: string
  description: string | null
  postCount: number
}

type Murmur = {
  id: string
  content: string
  replyCount: number
  upvoteCount: number
  createdAt: string
  authorNickname: string
  authorLevel: string
}

// Simulated online counts (will be real-time later)
const ONLINE: Record<string, number> = {
  'taiwan-politics': 2341,
  'international-news': 1208,
  'tech': 986,
  'life': 754,
  'finance': 521,
  'sports': 348,
}

const LEVEL_COLOR: Record<string, string> = {
  level_4: 'text-[#F5A623]',
  level_3: 'text-[#58A6FF]',
  level_2: 'text-[#3FB950]',
  level_1: 'text-[#8B949E]',
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

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return (t === 'murmurs' || t === 'favorites' || t === 'map') ? t : 'popular'
  })
  const onlineFallback = useRef<Record<string, number>>({})
  const murmurSentinelRef = useRef<HTMLDivElement>(null)
  const [favorites, setFavorites] = useState<Board[]>([])
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.replace('/verify')
  }, [router])

  const { data: boardsData, isLoading: loading } = useSWR<Board[]>('/api/boards', (url: string) =>
    fetch(url).then(r => r.ok ? r.json() : [])
  )
  const boards = boardsData ?? []
  useEffect(() => {
    boards.forEach(b => {
      if (!ONLINE[b.slug]) onlineFallback.current[b.slug] = Math.floor(Math.random() * 500 + 100)
    })
  }, [boards])

  // 頁面載入時就拿收藏清單，讓熱門板塊的星號能正確顯示
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const token = localStorage.getItem('token') ?? ''
    if (!token) return
    fetch('/api/me/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { id: string }[]) => {
        setFavoriteIds(new Set(data.map(b => b.id)))
        setFavorites(data as Board[])
        setFavoritesLoaded(true)
      })
      .catch(() => {})
  }, [])

  async function toggleFavorite(e: React.MouseEvent, board: Board) {
    e.stopPropagation()
    const token = localStorage.getItem('token') ?? ''
    const isFav = favoriteIds.has(board.id)
    // optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev)
      isFav ? next.delete(board.id) : next.add(board.id)
      return next
    })
    setFavorites(prev => isFav ? prev.filter(b => b.id !== board.id) : [...prev, board])
    await fetch('/api/me/favorites', {
      method: isFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ boardId: board.id }),
    })
  }

  function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const next = [...favorites]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    setFavorites(next)
    setDragIdx(null)
    setDragOverIdx(null)
    const token = localStorage.getItem('token') ?? ''
    fetch('/api/me/favorites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order: next.map(b => b.id) }),
    })
  }

  const [nickname, setNickname] = useState('M')
  useEffect(() => {
    setNickname(localStorage.getItem('nickname') ?? 'M')
  }, [])

  const { data: murmurPages, size: murmurSize, setSize: setMurmurSize, isLoading: murmursLoading } = useSWRInfinite<{ items: Murmur[]; nextCursor: string | null }>(
    (pageIndex, prevData) => {
      if (tab !== 'murmurs') return null
      if (prevData && !prevData.nextCursor) return null
      return pageIndex === 0 ? '/api/murmurs' : `/api/murmurs?cursor=${prevData!.nextCursor}`
    },
    (url) => fetch(url).then(r => r.ok ? r.json() : { items: [], nextCursor: null })
  )
  const murmurs = murmurPages?.flatMap(p => p?.items ?? []) ?? []
  const murmursHasMore = !!(murmurPages?.[murmurPages.length - 1]?.nextCursor)
  const murmursLoadingMore = murmurSize > (murmurPages?.length ?? 0)

  useEffect(() => {
    const el = murmurSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && murmursHasMore && !murmursLoadingMore) {
          setMurmurSize(s => s + 1)
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [murmursHasMore, murmursLoadingMore, setMurmurSize])

  function handleFab() {
    router.push('/murmurs/new')
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#21262D] flex-shrink-0">
        <h1 className="text-[22px] font-black tracking-[4px] text-[#E6EDF3]">
          AU<span className="text-[#F5A623]">R</span>EN
        </h1>
        <div className="flex items-center gap-4">
          {/* Notification bell */}
          <button className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          {/* Avatar */}
          <button
            onClick={() => router.push('/profile')}
            className="w-[30px] h-[30px] rounded-full bg-[#21262D] border-2 border-[#F5A623]
                        flex items-center justify-center text-[13px] font-bold text-[#F5A623]
                        active:scale-95 transition-transform"
          >
            {nickname[0].toUpperCase()}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#21262D] flex-shrink-0 overflow-x-auto scrollbar-none">
        {([
          { key: 'favorites', label: '我的最愛' },
          { key: 'popular',   label: '熱門板塊' },
          { key: 'map',       label: '板塊地圖' },
          { key: 'murmurs',   label: 'Murmurs' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              router.replace(t.key === 'popular' ? '/' : `/?tab=${t.key}`, { scroll: false })
            }}
            className={`flex-1 py-[11px] text-[12px] font-semibold whitespace-nowrap relative transition-colors
                        min-w-[72px]
                        ${tab === t.key ? 'text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#C9D1D9]'}`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-[#F5A623] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {tab === 'popular' && (
          <>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[11px] font-semibold text-[#3D444D] uppercase tracking-wider">
                熱門板塊 · {boards.length} 個
              </span>
            </div>

            {loading ? (
              <div className="px-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="px-4 space-y-2">
                {boards.map(board => (
                  <Link
                    key={board.id}
                    href={`/boards/${board.slug}`}
                    className="w-full text-left bg-[#161B22] border border-[#21262D] rounded-xl
                               p-4 hover:border-[#30363D] hover:bg-[#1C2128] transition-colors active:scale-[0.99] block"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-[15px] font-bold text-[#E6EDF3] flex-1 mr-2">{board.name}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFavorite(e, board) }}
                        className="flex-shrink-0 p-0.5 -mr-0.5 text-[#484F58] hover:text-[#F5A623] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24"
                          fill={favoriteIds.has(board.id) ? '#F5A623' : 'none'}
                          stroke={favoriteIds.has(board.id) ? '#F5A623' : 'currentColor'}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    </div>
                    {board.description && (
                      <p className="text-[12px] text-[#7D8590] mb-3 leading-relaxed">{board.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] flex-shrink-0" />
                        <span className="text-[12px] text-[#7D8590]">
                          <strong className="text-[#C9D1D9]">
                            {(ONLINE[board.slug] ?? onlineFallback.current[board.slug] ?? 0).toLocaleString()}
                          </strong> 在線
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#7D8590]">
                          📝 <strong className="text-[#C9D1D9]">{board.postCount.toLocaleString()}</strong> 今日
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'favorites' && (
          <>
            {!favoritesLoaded ? (
              <div className="px-4 pt-3 space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl h-24 animate-pulse" />)}
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="text-4xl mb-4">⭐</div>
                <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">還沒有收藏的板塊</p>
                <p className="text-[13px] text-[#7D8590]">在板塊列表或板塊內點星號收藏</p>
              </div>
            ) : (
              <div className="px-4 pt-3 space-y-2">
                {favorites.map((board, idx) => (
                  <div
                    key={board.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                    onClick={() => router.push(`/boards/${board.slug}`)}
                    className={`w-full text-left bg-[#161B22] border rounded-xl
                               p-4 transition-colors cursor-pointer select-none
                               ${dragOverIdx === idx && dragIdx !== idx
                                 ? 'border-[#F5A623]/60 bg-[#1C2128]'
                                 : dragIdx === idx
                                   ? 'border-[#21262D] opacity-40'
                                   : 'border-[#21262D] hover:border-[#30363D] hover:bg-[#1C2128]'
                               }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* drag handle */}
                      <div className="flex-shrink-0 mt-0.5 text-[#3D444D] cursor-grab active:cursor-grabbing touch-none">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                          <circle cx="4.5" cy="3" r="1.2"/><circle cx="9.5" cy="3" r="1.2"/>
                          <circle cx="4.5" cy="7" r="1.2"/><circle cx="9.5" cy="7" r="1.2"/>
                          <circle cx="4.5" cy="11" r="1.2"/><circle cx="9.5" cy="11" r="1.2"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-[15px] font-bold text-[#E6EDF3] flex-1 mr-2 truncate">{board.name}</span>
                          <button
                            onClick={(e) => toggleFavorite(e, board)}
                            className="flex-shrink-0 p-0.5 -mr-0.5 text-[#F5A623] hover:text-[#484F58] transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24"
                              fill="#F5A623" stroke="#F5A623"
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          </button>
                        </div>
                        {board.description && <p className="text-[12px] text-[#7D8590] mb-2 truncate">{board.description}</p>}
                        <span className="text-[11px] text-[#7D8590]">
                          <strong className="text-[#C9D1D9]">{board.postCount.toLocaleString()}</strong> 篇文章
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'map' && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">板塊地圖</p>
            <p className="text-[13px] text-[#7D8590]">即將推出</p>
          </div>
        )}

        {tab === 'murmurs' && (
          <>
            {murmursLoading ? (
              <div className="px-4 pt-3 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            ) : murmurs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">還沒有 Murmur</p>
                <p className="text-[13px] text-[#7D8590]">點右下角的 + 說點什麼吧</p>
              </div>
            ) : (
              <div className="px-4 pt-3 divide-y divide-[#21262D]">
                {murmurs.map(m => (
                  <Link key={m.id} href={`/murmurs/${m.id}`} className="py-4 block">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[13px] font-medium ${LEVEL_COLOR[m.authorLevel] ?? 'text-[#8B949E]'}`}>
                        {m.authorNickname}
                      </span>
                      <span className="text-[#3D444D] text-[11px]">·</span>
                      <span className="text-[12px] text-[#484F58]">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="text-[15px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1.5 text-[12px] text-[#7D8590]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {m.replyCount}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] text-[#7D8590]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        {m.upvoteCount}
                      </span>
                    </div>
                  </Link>
                ))}
                <div ref={murmurSentinelRef} className="h-4" />
                {murmursLoadingMore && (
                  <div className="py-3 flex justify-center">
                    <div className="w-5 h-5 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — 在 max-w 容器內定位，不跑出去 */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[500px] pointer-events-none z-10">
        <button
          onClick={handleFab}
          className="absolute right-6 bottom-0 w-[52px] h-[52px] rounded-full bg-[#F5A623]
                     flex items-center justify-center shadow-[0_4px_20px_rgba(245,166,35,0.45)]
                     active:scale-95 transition-transform pointer-events-auto"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Floating bottom nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10
                      bg-[#161B22]/85 backdrop-blur-xl border border-white/[0.08]
                      rounded-full px-7 py-3 flex items-center gap-8
                      shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {[
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: 'search', action: () => router.push('/search') },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.88"/></svg>, label: 'refresh', action: () => window.location.reload() },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'messages', action: () => {} },
          { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: 'settings', action: () => router.push('/profile') },
        ].map(({ icon, label, action }) => (
          <button key={label} onClick={action} className="text-[#E6EDF3]/35 hover:text-[#E6EDF3]/80 transition-colors">
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}
