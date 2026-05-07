'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewMurmurPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/verify')
  }, [router])

  async function submit() {
    if (!content.trim() || loading) return
    setError('')
    setLoading(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch('/api/murmurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.replace('/?tab=murmurs')
    } catch (e) {
      setError(e instanceof Error ? e.message : '發布失敗，請稍後再試')
      setLoading(false)
    }
  }

  const remaining = 500 - content.length

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

        <span className="text-[14px] font-semibold text-[#E6EDF3]">Murmur</span>

        <button
          onClick={submit}
          disabled={!content.trim() || loading}
          className="px-4 py-1.5 bg-[#F5A623] text-black text-[13px] font-bold rounded-full
                     disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-95"
        >
          {loading ? '發布中...' : '發布'}
        </button>
      </header>

      {/* Input */}
      <div className="flex-1 flex flex-col px-5 pt-5">
        {error && (
          <div className="flex items-start gap-2 bg-[#3D1F1F] border border-[#F85149]/30 rounded-lg px-4 py-3 mb-4">
            <span className="text-[#F85149] text-[13px]">!</span>
            <p className="text-[13px] text-[#F85149]">{error}</p>
          </div>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="說點什麼..."
          maxLength={500}
          autoFocus
          className="flex-1 w-full min-h-[200px] bg-transparent text-[16px] text-[#C9D1D9]
                     placeholder:text-[#3D444D] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#21262D] flex items-center justify-between">
        <span className="text-[11px] text-[#3D444D]">發到你的個人空間，所有人可見</span>
        <span className={`text-[11px] ${remaining < 50 ? 'text-[#F85149]' : 'text-[#3D444D]'}`}>
          {remaining}
        </span>
      </div>
    </div>
  )
}
