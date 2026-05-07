'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.replace('/verify')
  }, [router])

  async function submit() {
    if (!title.trim() || !content.trim() || loading) return
    setError('')
    setLoading(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch(`/api/boards/${slug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.replace(`/boards/${slug}/posts/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '發文失敗，請稍後再試')
      setLoading(false)
    }
  }

  function applyFormat(format: 'bold' | 'italic' | 'bullet') {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = content

    if (format === 'bold' || format === 'italic') {
      const marker = format === 'bold' ? '**' : '*'
      const selected = val.slice(start, end) || (format === 'bold' ? '粗體' : '斜體')
      const newVal = val.slice(0, start) + `${marker}${selected}${marker}` + val.slice(end)
      setContent(newVal)
      setTimeout(() => {
        el.focus()
        const cur = start + marker.length + selected.length + marker.length
        el.setSelectionRange(cur, cur)
      }, 0)
    } else {
      // toggle bullet at start of current line
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const hasBullet = val.slice(lineStart).startsWith('- ')
      const newVal = hasBullet
        ? val.slice(0, lineStart) + val.slice(lineStart + 2)
        : val.slice(0, lineStart) + '- ' + val.slice(lineStart)
      setContent(newVal)
      setTimeout(() => el.focus(), 0)
    }
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !loading

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col max-w-[500px] mx-auto">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#21262D] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors p-1 -ml-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <span className="text-[14px] font-semibold text-[#E6EDF3]">發表文章</span>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="px-4 py-1.5 bg-[#F5A623] text-black text-[13px] font-bold rounded-full
                     disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-95"
        >
          {loading ? '發布中...' : '發布'}
        </button>
      </header>

      {/* Form */}
      <div className="flex-1 flex flex-col px-5 pt-5 gap-4 overflow-hidden">
        {error && (
          <div className="flex items-start gap-2.5 bg-[#3D1F1F] border border-[#F85149]/30 rounded-lg px-4 py-3 flex-shrink-0">
            <span className="text-[#F85149] text-[13px]">!</span>
            <p className="text-[13px] text-[#F85149]">{error}</p>
          </div>
        )}

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="標題"
          maxLength={200}
          autoFocus
          className="w-full bg-transparent text-[20px] font-bold text-[#E6EDF3]
                     placeholder:text-[#3D444D] focus:outline-none border-none flex-shrink-0"
        />

        <div className="h-px bg-[#21262D] flex-shrink-0" />

        <textarea
          ref={contentRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="說點什麼..."
          className="flex-1 w-full min-h-[200px] bg-transparent text-[15px] text-[#C9D1D9]
                     placeholder:text-[#3D444D] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Formatting toolbar + footer */}
      <div className="border-t border-[#21262D] flex-shrink-0">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#21262D]">
          <button
            onMouseDown={e => { e.preventDefault(); applyFormat('bold') }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7D8590]
                       hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors text-[14px] font-bold"
            title="粗體"
          >
            B
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); applyFormat('italic') }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7D8590]
                       hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors text-[14px] italic font-medium"
            title="斜體"
          >
            I
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); applyFormat('bullet') }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7D8590]
                       hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
            title="條列"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="6" x2="20" y2="6"/>
              <line x1="9" y1="12" x2="20" y2="12"/>
              <line x1="9" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-[#3D444D]">你的身份對其他用戶完全匿名</span>
          <span className={`text-[11px] ${title.length > 180 ? 'text-[#F85149]' : 'text-[#3D444D]'}`}>
            {title.length}/200
          </span>
        </div>
      </div>
    </div>
  )
}
