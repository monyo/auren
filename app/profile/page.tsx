'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type User = {
  id: string
  nickname: string
  verificationLevel: string
  dailyPostCount: number
  createdAt: string
}

const LEVEL_LABEL: Record<string, { label: string; color: string; desc: string }> = {
  level_1: { label: 'Level 1', color: 'text-[#8B949E]', desc: '手機門號驗證' },
  level_2: { label: 'Level 2', color: 'text-[#3FB950]', desc: '裝置綁定' },
  level_3: { label: 'Level 3', color: 'text-[#58A6FF]', desc: '支付驗證' },
  level_4: { label: 'Level 4', color: 'text-[#F5A623]', desc: '政府 ID' },
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'other'>('other')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/verify'); return }
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setUser(data); setNicknameInput(data.nickname); localStorage.setItem('nickname', data.nickname); setLoading(false) })
      .catch(() => setLoading(false))
  }, [router])

  async function saveNickname() {
    if (!nicknameInput.trim() || saving) return
    setSaveError('')
    setSaving(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: nicknameInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUser(u => u ? { ...u, nickname: nicknameInput.trim() } : u)
      localStorage.setItem('nickname', nicknameInput.trim())
      setEditingNickname(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.clear()
    router.replace('/verify')
  }

  async function sendFeedback() {
    if (!feedbackContent.trim() || feedbackSending) return
    setFeedbackError('')
    setFeedbackSending(true)
    const token = localStorage.getItem('token') ?? ''
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: feedbackContent, category: feedbackCategory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedbackSent(true)
      setFeedbackContent('')
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : '送出失敗')
    } finally {
      setFeedbackSending(false)
    }
  }

  const level = user ? (LEVEL_LABEL[user.verificationLevel] ?? LEVEL_LABEL.level_1) : null

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
        <h1 className="text-[16px] font-bold text-[#E6EDF3]">個人資料</h1>
      </header>

      <div className="flex-1 px-5 pt-6 pb-10 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#161B22] border border-[#21262D] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : user ? (
          <>
            {/* Avatar + name */}
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#21262D] border-2 border-[#F5A623]
                              flex items-center justify-center text-[28px] font-black text-[#F5A623] mb-3">
                {user.nickname[0].toUpperCase()}
              </div>
              <p className={`text-[15px] font-semibold ${level?.color}`}>{user.nickname}</p>
              <p className="text-[12px] text-[#484F58] mt-1">{level?.label} · {level?.desc}</p>
            </div>

            {/* Nickname edit */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider">暱稱</span>
                {!editingNickname && (
                  <button
                    onClick={() => { setEditingNickname(true); setNicknameInput(user.nickname) }}
                    className="text-[12px] text-[#7D8590] hover:text-[#F5A623] transition-colors"
                  >
                    修改
                  </button>
                )}
              </div>
              {editingNickname ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    maxLength={20}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveNickname()}
                    className="w-full h-10 bg-[#0D1117] border border-[#30363D] rounded-lg px-3
                               text-[14px] text-[#E6EDF3] focus:outline-none focus:border-[#F5A623] transition-colors"
                  />
                  {saveError && <p className="text-[12px] text-[#F85149]">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveNickname}
                      disabled={!nicknameInput.trim() || saving}
                      className="flex-1 h-9 bg-[#F5A623] text-black text-[13px] font-semibold rounded-lg
                                 disabled:opacity-40 transition-opacity"
                    >
                      {saving ? '儲存中...' : '儲存'}
                    </button>
                    <button
                      onClick={() => { setEditingNickname(false); setSaveError('') }}
                      className="flex-1 h-9 bg-[#21262D] text-[#8B949E] text-[13px] rounded-lg
                                 hover:bg-[#30363D] transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] font-semibold text-[#E6EDF3]">{user.nickname}</p>
              )}
            </div>

            {/* Verification level */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block mb-3">驗證等級</span>
              <div className="space-y-2">
                {(['level_1', 'level_2', 'level_3', 'level_4'] as const).map((lvl) => {
                  const info = LEVEL_LABEL[lvl]
                  const active = user.verificationLevel === lvl
                  const past = ['level_1', 'level_2', 'level_3', 'level_4'].indexOf(lvl)
                    <= ['level_1', 'level_2', 'level_3', 'level_4'].indexOf(user.verificationLevel)
                  return (
                    <div key={lvl} className={`flex items-center gap-3 py-1.5 ${!past ? 'opacity-30' : ''}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${past ? 'bg-[#3FB950]' : 'bg-[#3D444D]'}`} />
                      <span className={`text-[13px] font-medium flex-1 ${active ? info.color : 'text-[#8B949E]'}`}>
                        {info.label}
                      </span>
                      <span className="text-[12px] text-[#484F58]">{info.desc}</span>
                      {active && (
                        <span className="text-[10px] font-semibold text-[#3FB950] bg-[#3FB950]/10
                                         border border-[#3FB950]/20 rounded-full px-2 py-0.5">
                          目前
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Joined date */}
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] text-[#7D8590]">加入時間</span>
              <span className="text-[13px] text-[#C9D1D9]">
                {new Date(user.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {/* My Space link */}
            <button
              onClick={() => router.push(`/u/${user.nickname}`)}
              className="w-full py-3.5 text-[14px] font-semibold text-[#E6EDF3]
                         bg-[#161B22] border border-[#21262D] rounded-xl
                         hover:border-[#30363D] hover:bg-[#1C2128] transition-colors
                         flex items-center justify-between px-4"
            >
              <span>我的 Murmur 空間</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3D444D]">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Feedback */}
            <button
              onClick={() => { setShowFeedback(true); setFeedbackSent(false); setFeedbackError('') }}
              className="w-full py-3.5 text-[14px] font-semibold text-[#E6EDF3]
                         bg-[#161B22] border border-[#21262D] rounded-xl
                         hover:border-[#30363D] hover:bg-[#1C2128] transition-colors
                         flex items-center justify-between px-4"
            >
              <span>意見回饋</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3D444D]">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full py-3.5 text-[14px] font-semibold text-[#F85149]
                         bg-[#161B22] border border-[#21262D] rounded-xl
                         hover:border-[#F85149]/30 hover:bg-[#3D1F1F]/30 transition-colors"
            >
              登出
            </button>
          </>
        ) : (
          <p className="text-center text-[14px] text-[#7D8590] py-20">載入失敗</p>
        )}
      </div>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
             onClick={e => { if (e.target === e.currentTarget) setShowFeedback(false) }}>
          <div className="bg-[#161B22] border-t border-[#21262D] rounded-t-2xl w-full max-w-[500px] px-5 pt-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-[#E6EDF3]">意見回饋</h3>
              <button onClick={() => setShowFeedback(false)} className="text-[#484F58] hover:text-[#8B949E] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {feedbackSent ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-3">🙏</div>
                <p className="text-[15px] font-semibold text-[#E6EDF3] mb-1">謝謝你的回饋</p>
                <p className="text-[13px] text-[#7D8590]">我們會認真看每一則</p>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="mt-5 px-6 py-2.5 bg-[#F5A623] text-black text-[13px] font-semibold rounded-xl"
                >
                  關閉
                </button>
              </div>
            ) : (
              <>
                {/* Category */}
                <div className="flex gap-2 mb-3">
                  {([['bug', '🐛 Bug'], ['feature', '💡 建議'], ['other', '💬 其他']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFeedbackCategory(val)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors
                        ${feedbackCategory === val
                          ? 'bg-[#F5A623] text-black'
                          : 'bg-[#21262D] text-[#7D8590] hover:text-[#E6EDF3]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackContent}
                  onChange={e => setFeedbackContent(e.target.value)}
                  placeholder="說說你遇到什麼問題，或有什麼想法..."
                  rows={5}
                  autoFocus
                  maxLength={2000}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl
                             px-4 py-3 text-[14px] text-[#E6EDF3] placeholder:text-[#484F58]
                             focus:outline-none focus:border-[#F5A623] resize-none transition-colors mb-2"
                />
                <div className="flex items-center justify-between mb-3">
                  {feedbackError
                    ? <p className="text-[12px] text-[#F85149]">{feedbackError}</p>
                    : <span />}
                  <span className="text-[11px] text-[#484F58]">{feedbackContent.length}/2000</span>
                </div>

                <button
                  onClick={sendFeedback}
                  disabled={!feedbackContent.trim() || feedbackSending}
                  className="w-full h-11 bg-[#F5A623] text-black text-[14px] font-semibold rounded-xl
                             disabled:opacity-40 transition-opacity"
                >
                  {feedbackSending ? '送出中...' : '送出'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
