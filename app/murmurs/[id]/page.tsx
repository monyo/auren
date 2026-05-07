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
  isAuthor: boolean
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
  const [upvoted, setUpvoted] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/verify')
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('token') ?? ''
    fetch(`/api/murmurs/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then(r => r.ok ? r.json() : null)
      .then(m => { if (m?.id) setMurmur(m) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch(`/api/murmurs/${id}/replies`)
      .then(r => r.ok ? r.json() : [])
      .then(r => Array.isArray(r) && setReplies(r))
      .catch(() => {})

    if (token) {
      fetch(`/api/murmurs/${id}/upvote`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : { upvoted: false })
        .then(data => setUpvoted(data.upvoted ?? false))
        .catch(() => {})
    }
  }, [id])

  async function toggleUpvote() {
    if (!murmur) return
    const token = localStorage.getItem('token') ?? ''
    const newUpvoted = !upvoted
    setUpvoted(newUpvoted)
    setMurmur(m => m ? { ...m, upvoteCount: m.upvoteCount + (newUpvoted ? 1 : -1) } : m)
    try {
      const res = await fetch(`/api/murmurs/${id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUpvoted(data.upvoted)
        setMurmur(m => m ? { ...m, upvoteCount: data.upvoteCount } : m)
      } else {
        setUpvoted(!newUpvoted)
        setMurmur(m => m ? { ...m, upvoteCount: m.upvoteCount - (newUpvoted ? 1 : -1) } : m)
      }
    } catch {
      setUpvoted(!newUpvoted)
      setMurmur(m => m ? { ...m, upvoteCount: m.upvoteCount - (newUpvoted ? 1 : -1) } : m)
    }
  }

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
      setReplies(prev => [...prev, {
        id: data.id,
        content: replyText.trim(),
        createdAt: new Date().toISOString(),
        authorNickname: nickname,
        authorLevel: localStorage.getItem('verificationLevel') ?? 'level_1',
      }])
      setReplyText('')
      if (murmur) setMurmur({ ...murmur, replyCount: murmur.replyCount + 1 })
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : '留言失敗')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit() {
    if (!murmur) return
    setEditContent(murmur.content)
    setEditError('')
    setEditing(true)
    setShowMenu(false)
  }

  async function saveEdit() {
    if (!editContent.trim() || editSaving) return
    setEditError('')
    setEditSaving(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/murmurs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMurmur(m => m ? { ...m, content: editContent.trim(), contentEditedAt: data.contentEditedAt } : m)
      setEditing(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteMurmur() {
    setDeleting(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/murmurs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) router.replace('/')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button onClick={() => router.back()} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1 flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[14px] font-semibold text-[#E6EDF3] flex-1">Murmur</span>
        {murmur?.isAuthor && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 bg-[#1C2128] border border-[#30363D] rounded-xl
                                shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden min-w-[120px]">
                  <button
                    onClick={startEdit}
                    className="w-full text-left px-4 py-3 text-[14px] text-[#E6EDF3]
                               hover:bg-[#21262D] transition-colors flex items-center gap-2.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    編輯
                  </button>
                  <div className="border-t border-[#21262D]" />
                  <button
                    onClick={() => { setConfirmDelete(true); setShowMenu(false) }}
                    className="w-full text-left px-4 py-3 text-[14px] text-[#F85149]
                               hover:bg-[#21262D] transition-colors flex items-center gap-2.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    刪除
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
                {murmur.contentEditedAt && (
                  <>
                    <span className="text-[#3D444D] text-[11px]">·</span>
                    <span className="text-[11px] text-[#3D444D]">已編輯</span>
                  </>
                )}
              </div>

              {editing ? (
                <div className="space-y-2 mb-4">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl
                               px-4 py-3 text-[14px] text-[#E6EDF3] leading-relaxed
                               focus:outline-none focus:border-[#F5A623] resize-none transition-colors"
                  />
                  {editError && <p className="text-[12px] text-[#F85149]">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={!editContent.trim() || editSaving}
                      className="flex-1 h-9 bg-[#F5A623] text-black text-[13px] font-semibold rounded-lg
                                 disabled:opacity-40 transition-opacity"
                    >
                      {editSaving ? '儲存中...' : '儲存'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setEditError('') }}
                      className="flex-1 h-9 bg-[#21262D] text-[#8B949E] text-[13px] rounded-lg
                                 hover:bg-[#30363D] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[16px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap mb-4">
                  {murmur.content}
                </p>
              )}

              <div className="flex items-center gap-5 pt-4 border-t border-[#21262D]">
                <button
                  onClick={toggleUpvote}
                  className={`flex items-center gap-1.5 text-[13px] transition-colors
                    ${upvoted ? 'text-[#F5A623]' : 'text-[#7D8590] hover:text-[#E6EDF3]'}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"
                    fill={upvoted ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  {murmur.upvoteCount}
                </button>
                <button
                  onClick={() => replyRef.current?.focus()}
                  className="flex items-center gap-1.5 text-[13px] text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
                >
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

      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-6 bg-black/60">
          <div className="bg-[#1C2128] border border-[#30363D] rounded-2xl p-6 w-full max-w-[320px]">
            <h3 className="text-[16px] font-bold text-[#E6EDF3] mb-2">刪除 Murmur？</h3>
            <p className="text-[13px] text-[#7D8590] mb-5">這個動作無法復原。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 bg-[#21262D] text-[#8B949E] text-[14px] rounded-xl hover:bg-[#30363D] transition-colors"
              >
                取消
              </button>
              <button
                onClick={deleteMurmur}
                disabled={deleting}
                className="flex-1 h-10 bg-[#F85149] text-white text-[14px] font-semibold rounded-xl disabled:opacity-50 transition-opacity"
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
