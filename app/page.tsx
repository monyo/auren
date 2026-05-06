'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'favorites' | 'popular' | 'map' | 'murmurs'

type Board = {
  id: string
  slug: string
  name: string
  description: string | null
  postCount: number
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

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('popular')
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.replace('/verify')
  }, [router])

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(data => { setBoards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const nickname = typeof window !== 'undefined'
    ? (localStorage.getItem('nickname') ?? 'M')
    : 'M'

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
            onClick={() => setTab(t.key)}
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
                  <button
                    key={board.id}
                    onClick={() => router.push(`/boards/${board.slug}`)}
                    className="w-full text-left bg-[#161B22] border border-[#21262D] rounded-xl
                               p-4 hover:border-[#30363D] hover:bg-[#1C2128] transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-[15px] font-bold text-[#E6EDF3]">{board.name}</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3D444D] flex-shrink-0 mt-0.5">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {board.description && (
                      <p className="text-[12px] text-[#7D8590] mb-3 leading-relaxed">{board.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950] flex-shrink-0" />
                        <span className="text-[12px] text-[#7D8590]">
                          <strong className="text-[#C9D1D9]">
                            {(ONLINE[board.slug] ?? Math.floor(Math.random() * 500 + 100)).toLocaleString()}
                          </strong> 在線
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#7D8590]">
                          📝 <strong className="text-[#C9D1D9]">{board.postCount.toLocaleString()}</strong> 今日
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'favorites' && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">⭐</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">還沒有收藏的板塊</p>
            <p className="text-[13px] text-[#7D8590]">在熱門板塊找到喜歡的，點右上角收藏</p>
          </div>
        )}

        {tab === 'map' && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">板塊地圖</p>
            <p className="text-[13px] text-[#7D8590]">即將推出</p>
          </div>
        )}

        {tab === 'murmurs' && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">Murmurs</p>
            <p className="text-[13px] text-[#7D8590]">即將推出</p>
          </div>
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
