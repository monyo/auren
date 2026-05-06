'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      <div className="flex-1 flex flex-col px-5 pt-5 gap-4">
        {error && (
          <div className="flex items-start gap-2.5 bg-[#3D1F1F] border border-[#F85149]/30 rounded-lg px-4 py-3">
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
                     placeholder:text-[#3D444D] focus:outline-none border-none"
        />

        <div className="h-px bg-[#21262D]" />

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="說點什麼..."
          className="flex-1 w-full min-h-[300px] bg-transparent text-[15px] text-[#C9D1D9]
                     placeholder:text-[#3D444D] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-[#21262D] flex items-center justify-between">
        <span className="text-[11px] text-[#3D444D]">你的身份對其他用戶完全匿名</span>
        <span className={`text-[11px] ${title.length > 180 ? 'text-[#F85149]' : 'text-[#3D444D]'}`}>
          {title.length}/200
        </span>
      </div>
    </div>
  )
}
