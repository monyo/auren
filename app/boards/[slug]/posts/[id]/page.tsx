'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import useSWR from 'swr'

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0, key = 0, match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++} className="font-semibold text-[#E6EDF3]">{match[1]}</strong>)
    } else {
      nodes.push(<em key={key++} className="italic">{match[2]}</em>)
    }
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderBody(content: string): ReactNode {
  const lines = content.split('\n')
  const nodes: ReactNode[] = []
  let bullets: string[] = []
  let key = 0

  function flush() {
    if (!bullets.length) return
    nodes.push(
      <ul key={key++} className="list-disc pl-5 my-1 space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-[15px] text-[#C9D1D9] leading-relaxed">{parseInline(b)}</li>
        ))}
      </ul>
    )
    bullets = []
  }

  for (const line of lines) {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
    } else {
      flush()
      if (line === '') {
        nodes.push(<div key={key++} className="h-3" />)
      } else {
        nodes.push(
          <p key={key++} className="text-[15px] text-[#C9D1D9] leading-relaxed">{parseInline(line)}</p>
        )
      }
    }
  }
  flush()
  return <div className="space-y-0.5">{nodes}</div>
}

type Post = {
  id: string
  title: string
  content: string
  replyCount: number
  upvoteCount: number
  createdAt: string
  contentEditedAt: string | null
  authorNickname: string
  authorLevel: string
  boardSlug: string
  boardName: string
  isAuthor: boolean
}

type Reply = {
  id: string
  content: string
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

export default function PostPage() {
  const router = useRouter()
  const { slug, id } = useParams<{ slug: string; id: string }>()

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
    const token = localStorage.getItem('token')
    if (!token) router.replace('/verify')
  }, [router])

  const { data: post, mutate: mutatePost, isLoading: loadingPost } = useSWR<Post>(
    id ? `/api/posts/${id}` : null,
    (url: string) => {
      const token = localStorage.getItem('token') ?? ''
      return fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
        .then(r => r.ok ? r.json() : null)
    }
  )

  const { data: repliesData, mutate: mutateReplies } = useSWR<Reply[]>(
    id ? `/api/posts/${id}/replies` : null,
    (url: string) => fetch(url).then(r => r.ok ? r.json() : [])
  )
  const replies = repliesData ?? []

  useEffect(() => {
    const token = localStorage.getItem('token') ?? ''
    if (!id || !token) return
    fetch(`/api/posts/${id}/upvote`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { upvoted: false })
      .then(data => setUpvoted(data.upvoted ?? false))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    const es = new EventSource(`/api/posts/${id}/stream`)

    es.addEventListener('reply', (e: MessageEvent) => {
      const reply = JSON.parse(e.data) as Reply
      mutateReplies(prev => {
        const existing = prev ?? []
        if (existing.some(r => r.id === reply.id)) return existing
        return [...existing, reply]
      }, false)
      mutatePost(p => p ? { ...p, replyCount: p.replyCount + 1 } : p, false)
    })

    return () => es.close()
  }, [id, mutateReplies, mutatePost])

  async function toggleUpvote() {
    if (!post) return
    const token = localStorage.getItem('token') ?? ''
    const newUpvoted = !upvoted
    setUpvoted(newUpvoted)
    mutatePost(p => p ? { ...p, upvoteCount: p.upvoteCount + (newUpvoted ? 1 : -1) } : p, false)
    try {
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUpvoted(data.upvoted)
        mutatePost(p => p ? { ...p, upvoteCount: data.upvoteCount } : p, false)
      } else {
        setUpvoted(!newUpvoted)
        mutatePost(p => p ? { ...p, upvoteCount: p.upvoteCount - (newUpvoted ? 1 : -1) } : p, false)
      }
    } catch {
      setUpvoted(!newUpvoted)
      mutatePost(p => p ? { ...p, upvoteCount: p.upvoteCount - (newUpvoted ? 1 : -1) } : p, false)
    }
  }

  async function submitReply() {
    if (!replyText.trim() || submitting) return
    setReplyError('')
    setSubmitting(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/posts/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: replyText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const nickname = localStorage.getItem('nickname') ?? '我'
      const newReply: Reply = {
        id: data.id,
        content: replyText.trim(),
        upvoteCount: 0,
        createdAt: new Date().toISOString(),
        authorNickname: nickname,
        authorLevel: localStorage.getItem('verificationLevel') ?? 'level_1',
      }
      mutateReplies(prev => [...(prev ?? []), newReply], false)
      setReplyText('')
      mutatePost(p => p ? { ...p, replyCount: p.replyCount + 1 } : p, false)
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : '留言失敗')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit() {
    if (!post) return
    setEditContent(post.content)
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
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      mutatePost(p => p ? { ...p, content: editContent.trim(), contentEditedAt: data.contentEditedAt } : p, false)
      setEditing(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setEditSaving(false)
    }
  }

  async function deletePost() {
    setDeleting(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        router.replace(`/boards/${slug}`)
      }
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1 flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[14px] font-semibold text-[#7D8590] truncate flex-1">
          {post?.boardName ?? slug}
        </span>
        {post?.isAuthor && (
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-32">

        {loadingPost ? (
          <div className="px-5 pt-5 space-y-4">
            <div className="h-7 bg-[#21262D] rounded-lg animate-pulse w-3/4" />
            <div className="h-4 bg-[#21262D] rounded animate-pulse w-1/3" />
            <div className="space-y-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-[#21262D] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : post ? (
          <>
            {/* Post body */}
            <div className="px-5 pt-5 pb-5 border-b border-[#21262D]">
              <h1 className="text-[20px] font-bold text-[#E6EDF3] leading-snug mb-3">
                {post.title}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[13px] font-medium ${LEVEL_COLOR[post.authorLevel] ?? 'text-[#8B949E]'}`}>
                  {post.authorNickname}
                </span>
                <span className="text-[#3D444D] text-[11px]">·</span>
                <span className="text-[12px] text-[#484F58]">{timeAgo(post.createdAt)}</span>
                {post.contentEditedAt && (
                  <>
                    <span className="text-[#3D444D] text-[11px]">·</span>
                    <span className="text-[11px] text-[#3D444D]">已編輯</span>
                  </>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    autoFocus
                    rows={6}
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
                renderBody(post.content)
              )}

              <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[#21262D]">
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
                  {post.upvoteCount}
                </button>
                <button
                  onClick={() => replyRef.current?.focus()}
                  className="flex items-center gap-1.5 text-[13px] text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {post.replyCount} 則留言
                </button>
              </div>
            </div>

            {/* Replies */}
            <div className="divide-y divide-[#21262D]">
              {replies.length === 0 ? (
                <p className="px-5 py-8 text-[13px] text-[#484F58] text-center">還沒有留言，來第一個留言吧</p>
              ) : replies.map(reply => (
                <div key={reply.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[13px] font-medium ${LEVEL_COLOR[reply.authorLevel] ?? 'text-[#8B949E]'}`}>
                      {reply.authorNickname}
                    </span>
                    <span className="text-[#3D444D] text-[11px]">·</span>
                    <span className="text-[12px] text-[#484F58]">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-[14px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[15px] text-[#7D8590]">找不到這篇文章</p>
          </div>
        )}
      </div>

      {/* Reply input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px]
                      bg-[#161B22] border-t border-[#21262D] px-4 py-3">
        {replyError && (
          <p className="text-[12px] text-[#F85149] mb-2">{replyError}</p>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() }
            }}
            placeholder="留言..."
            rows={1}
            className="flex-1 min-h-[38px] max-h-[120px] bg-[#0D1117] border border-[#30363D] rounded-xl
                       px-4 py-2 text-[14px] text-[#E6EDF3] placeholder:text-[#484F58]
                       focus:outline-none focus:border-[#F5A623] resize-none leading-relaxed
                       transition-colors overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={submitReply}
            disabled={!replyText.trim() || submitting}
            className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity
                       active:scale-95 flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-6 bg-black/60">
          <div className="bg-[#1C2128] border border-[#30363D] rounded-2xl p-6 w-full max-w-[320px]">
            <h3 className="text-[16px] font-bold text-[#E6EDF3] mb-2">刪除文章？</h3>
            <p className="text-[13px] text-[#7D8590] mb-5">這個動作無法復原。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 bg-[#21262D] text-[#8B949E] text-[14px] rounded-xl
                           hover:bg-[#30363D] transition-colors"
              >
                取消
              </button>
              <button
                onClick={deletePost}
                disabled={deleting}
                className="flex-1 h-10 bg-[#F85149] text-white text-[14px] font-semibold rounded-xl
                           disabled:opacity-50 transition-opacity"
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
