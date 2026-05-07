'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'

type UserInfo = {
  id: string
  nickname: string
  verificationLevel: string
}

type MurmurItem = {
  id: string
  content: string
  isPrivate: boolean
  replyCount: number
  upvoteCount: number
  createdAt: string
}

type Page = {
  user: UserInfo
  items: MurmurItem[]
  nextCursor: string | null
  isOwner: boolean
  error?: string
}

const LEVEL_COLOR: Record<string, string> = {
  level_4: 'text-[#F5A623]',
  level_3: 'text-[#58A6FF]',
  level_2: 'text-[#3FB950]',
  level_1: 'text-[#8B949E]',
}

const LEVEL_LABEL: Record<string, string> = {
  level_4: 'Lv.4',
  level_3: 'Lv.3',
  level_2: 'Lv.2',
  level_1: 'Lv.1',
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

export default function UserSpacePage() {
  const router = useRouter()
  const { nickname } = useParams<{ nickname: string }>()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    const t = localStorage.getItem('token') ?? ''
    if (!t) { router.replace('/verify'); return }
    setToken(t)
  }, [router])

  const { data: pages, size, setSize, isLoading } = useSWRInfinite<Page>(
    (pageIndex, prevData) => {
      if (!token) return null
      if (prevData && !prevData.nextCursor) return null
      const base = `/api/users/${encodeURIComponent(nickname)}/murmurs`
      const url = pageIndex === 0 ? base : `${base}?cursor=${prevData!.nextCursor}`
      return [url, token]
    },
    ([url, tok]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json())
  )

  const firstPage = pages?.[0]
  const user = firstPage?.user ?? null
  const isOwner = firstPage?.isOwner ?? false
  const notFound = firstPage?.error === 'User not found'

  const items = pages?.flatMap(p => p?.items ?? []) ?? []
  const hasMore = !!(pages?.[pages.length - 1]?.nextCursor)
  const isLoadingMore = size > (pages?.length ?? 0)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setSize(s => s + 1)
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, setSize])

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center max-w-[500px] mx-auto px-8 text-center">
        <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">找不到這個用戶</p>
        <button onClick={() => router.back()} className="text-[13px] text-[#F5A623]">返回</button>
      </div>
    )
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
        <h1 className="text-[16px] font-bold text-[#E6EDF3] truncate flex-1">
          {user?.nickname ?? nickname}
        </h1>
      </header>

      {/* Profile strip */}
      {user && (
        <div className="px-5 py-4 border-b border-[#21262D]">
          <div className="flex items-center gap-3">
            <div className="w-[48px] h-[48px] rounded-full bg-[#21262D] border-2 border-[#F5A623]
                            flex items-center justify-center text-[20px] font-bold text-[#F5A623] flex-shrink-0">
              {user.nickname[0].toUpperCase()}
            </div>
            <div>
              <p className={`text-[16px] font-bold ${LEVEL_COLOR[user.verificationLevel] ?? 'text-[#E6EDF3]'}`}>
                {user.nickname}
              </p>
              <p className="text-[12px] text-[#484F58]">{LEVEL_LABEL[user.verificationLevel] ?? ''} · Murmur 空間</p>
            </div>
            {isOwner && (
              <button
                onClick={() => router.push('/murmurs/new')}
                className="ml-auto px-3 py-1.5 bg-[#F5A623] text-black text-[12px] font-bold rounded-full
                           active:scale-95 transition-transform"
              >
                + 發 Murmur
              </button>
            )}
          </div>
        </div>
      )}

      {/* Murmur list */}
      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading && items.length === 0 ? (
          <div className="px-4 pt-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#161B22] border border-[#21262D] rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-[15px] font-semibold text-[#E6EDF3] mb-2">還沒有 Murmur</p>
            {isOwner && (
              <p className="text-[13px] text-[#7D8590]">點上方的按鈕說點什麼吧</p>
            )}
          </div>
        ) : (
          <div className="px-4 pt-3 divide-y divide-[#21262D]">
            {items.map(m => (
              <div
                key={m.id}
                className="py-4 cursor-pointer"
                onClick={() => !m.isPrivate && router.push(`/murmurs/${m.id}`)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-[15px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[11px] text-[#484F58]">{timeAgo(m.createdAt)}</span>
                      {!m.isPrivate && (
                        <span className="flex items-center gap-1.5 text-[12px] text-[#7D8590]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          {m.replyCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.isPrivate && (
                    <div className="flex-shrink-0 mt-0.5 text-[#F5A623]" title="只有你看得到">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} className="h-4" />
            {isLoadingMore && (
              <div className="py-3 flex justify-center">
                <div className="w-5 h-5 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
