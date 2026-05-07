'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Murmur = {
  id: string
  content: string
  replyCount: number
  upvoteCount: number
  createdAt: string
  contentEditedAt: string | null
  authorNickname: string
  authorLevel: string
}

type Reply = {
  id: string
  content: string
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
  return d < 30 ? `${d} 天前` : new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

const LEVEL_COLOR: Record<string, string> = {
  level_4: 'text-[#F5A623]',
  level_3: 'text-[#58A6FF]',
  level_2: 'text-[#3FB950]',
  level_1: 'text-[#8B949E]',
}

export default function MurmurPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [murmur, setMurmur] = useState<Murmur | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/verify')
  }, [router])

  useEffect(() => {
    fetch(`/api/murmurs/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(m => { if (m?.id) setMurmur(m) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch(`/api/murmurs/${id}/replies`)
      .then(r => r.ok ? r.json() : [])
      .then(r => Array.isArray(r) && setReplies(r))
      .catch(() => {})
  }, [id])

  async function submitReply() {
    if (!replyText.trim() || submitting) return
    setReplyError('')
    setSubmitting(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/murmurs/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: replyText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const nickname = localStorage.getItem('nickname') ?? '我'
      setReplies(prev => [{
        id: data.id,
        content: replyText.trim(),
        createdAt: new Date().toISOString(),
        authorNickname: nickname,
        authorLevel: localStorage.getItem('verificationLevel') ?? 'level_1',
      }, ...prev])
      setReplyText('')
      if (murmur) setMurmur({ ...murmur, replyCount: murmur.replyCount + 1 })
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : '留言失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button onClick={() => router.back()} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[14px] font-semibold text-[#E6EDF3]">Murmur</span>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="px-5 pt-5 space-y-3">
            <div className="h-4 bg-[#21262D] rounded animate-pulse w-1/3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-[#21262D] rounded animate-pulse" />)}
            </div>
          </div>
        ) : murmur ? (
          <>
            <div className="px-5 pt-5 pb-5 border-b border-[#21262D]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[13px] font-medium ${LEVEL_COLOR[murmur.authorLevel] ?? 'text-[#8B949E]'}`}>
                  {murmur.authorNickname}
                </span>
                <span className="text-[#3D444D] text-[11px]">·</span>
                <span className="text-[12px] text-[#484F58]">{timeAgo(murmur.createdAt)}</span>
              </div>
              <p className="text-[16px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap mb-4">
                {murmur.content}
              </p>
              <div className="flex items-center gap-5 pt-4 border-t border-[#21262D]">
                <button className="flex items-center gap-1.5 text-[13px] text-[#7D8590] hover:text-[#E6EDF3] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  {murmur.upvoteCount}
                </button>
                <button onClick={() => replyRef.current?.focus()} className="flex items-center gap-1.5 text-[13px] text-[#7D8590] hover:text-[#E6EDF3] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {murmur.replyCount} 則回應
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#21262D]">
              {replies.length === 0 ? (
                <p className="px-5 py-8 text-[13px] text-[#484F58] text-center">還沒有回應</p>
              ) : replies.map(r => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[13px] font-medium ${LEVEL_COLOR[r.authorLevel] ?? 'text-[#8B949E]'}`}>
                      {r.authorNickname}
                    </span>
                    <span className="text-[#3D444D] text-[11px]">·</span>
                    <span className="text-[12px] text-[#484F58]">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-[14px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-[14px] text-[#7D8590] py-20">找不到這則 Murmur</p>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] bg-[#161B22] border-t border-[#21262D] px-4 py-3">
        {replyError && <p className="text-[12px] text-[#F85149] mb-2">{replyError}</p>}
        <div className="flex items-end gap-3">
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
            placeholder="回應..."
            rows={1}
            className="flex-1 min-h-[38px] max-h-[120px] bg-[#0D1117] border border-[#30363D] rounded-xl
                       px-4 py-2 text-[14px] text-[#E6EDF3] placeholder:text-[#484F58]
                       focus:outline-none focus:border-[#F5A623] resize-none leading-relaxed transition-colors"
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim() || submitting}
            className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center
                       disabled:opacity-40 transition-opacity active:scale-95 flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
