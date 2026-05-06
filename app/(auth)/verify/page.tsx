'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = 'phone' | 'otp'

const COUNTRIES = [
  { code: 'TW', dial: '+886', name: '台灣', flag: '🇹🇼' },
  { code: 'CN', dial: '+86',  name: '中國', flag: '🇨🇳' },
  { code: 'HK', dial: '+852', name: '香港', flag: '🇭🇰' },
  { code: 'MO', dial: '+853', name: '澳門', flag: '🇲🇴' },
  { code: 'JP', dial: '+81',  name: '日本', flag: '🇯🇵' },
  { code: 'KR', dial: '+82',  name: '韓國', flag: '🇰🇷' },
  { code: 'SG', dial: '+65',  name: '新加坡', flag: '🇸🇬' },
  { code: 'MY', dial: '+60',  name: '馬來西亞', flag: '🇲🇾' },
  { code: 'TH', dial: '+66',  name: '泰國', flag: '🇹🇭' },
  { code: 'VN', dial: '+84',  name: '越南', flag: '🇻🇳' },
  { code: 'PH', dial: '+63',  name: '菲律賓', flag: '🇵🇭' },
  { code: 'ID', dial: '+62',  name: '印尼', flag: '🇮🇩' },
  { code: 'IN', dial: '+91',  name: '印度', flag: '🇮🇳' },
  { code: 'US', dial: '+1',   name: '美國', flag: '🇺🇸' },
  { code: 'CA', dial: '+1',   name: '加拿大', flag: '🇨🇦' },
  { code: 'GB', dial: '+44',  name: '英國', flag: '🇬🇧' },
  { code: 'AU', dial: '+61',  name: '澳洲', flag: '🇦🇺' },
  { code: 'DE', dial: '+49',  name: '德國', flag: '🇩🇪' },
  { code: 'FR', dial: '+33',  name: '法國', flag: '🇫🇷' },
  { code: 'NL', dial: '+31',  name: '荷蘭', flag: '🇳🇱' },
  { code: 'SE', dial: '+46',  name: '瑞典', flag: '🇸🇪' },
  { code: 'NO', dial: '+47',  name: '挪威', flag: '🇳🇴' },
  { code: 'DK', dial: '+45',  name: '丹麥', flag: '🇩🇰' },
  { code: 'CH', dial: '+41',  name: '瑞士', flag: '🇨🇭' },
  { code: 'ES', dial: '+34',  name: '西班牙', flag: '🇪🇸' },
  { code: 'IT', dial: '+39',  name: '義大利', flag: '🇮🇹' },
  { code: 'BR', dial: '+55',  name: '巴西', flag: '🇧🇷' },
  { code: 'MX', dial: '+52',  name: '墨西哥', flag: '🇲🇽' },
]

export default function VerifyPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [country, setCountry] = useState(COUNTRIES[0])
  const [localPhone, setLocalPhone] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fullPhone = country.dial + localPhone

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.includes(search) || c.dial.includes(search) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [dropdownOpen])

  const submitOtp = useCallback(async (code: string) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('verificationLevel', data.verificationLevel)
      router.push(data.isNewUser ? '/onboarding' : '/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }, [fullPhone, router])

  useEffect(() => {
    const code = otp.join('')
    if (code.length === 6 && !loading) submitOtp(code)
  }, [otp, loading, submitOtp])

  async function sendOtp() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep('otp')
      setCountdown(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) setTimeout(() => otpRefs.current[index + 1]?.focus(), 0)
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (otp[index]) { const next = [...otp]; next[index] = ''; setOtp(next) }
      else if (index > 0) otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = Array(6).fill('')
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    setTimeout(() => otpRefs.current[Math.min(digits.length, 5)]?.focus(), 0)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1117] px-5">

      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-[42px] font-black tracking-[6px] text-[#E6EDF3] leading-none">
          AU<span className="text-[#F5A623]">R</span>EN
        </h1>
        <p className="mt-3 text-[13px] text-[#7D8590] tracking-wide">真人可信交流平台</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[360px] bg-[#161B22] border border-[#21262D] rounded-2xl p-8">

        {step === 'phone' ? (
          <div>
            <h2 className="text-[17px] font-semibold text-[#E6EDF3] mb-1">登入 / 註冊</h2>
            <p className="text-[13px] text-[#7D8590] mb-6">輸入手機號碼，我們會發送驗證碼</p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
                手機號碼
              </label>

              {/* Phone input row */}
              <div className="flex gap-2">

                {/* Country code dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(o => !o)}
                    className="h-11 flex items-center gap-1.5 px-3 bg-[#0D1117] border border-[#30363D]
                               rounded-lg text-[14px] text-[#E6EDF3] whitespace-nowrap
                               focus:outline-none focus:border-[#F5A623]
                               hover:border-[#484F58] transition-colors"
                  >
                    <span className="text-[16px]">{country.flag}</span>
                    <span className="text-[#8B949E]">{country.dial}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#484F58]">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Dropdown panel */}
                  {dropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[260px]
                                    bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden">
                      {/* Search */}
                      <div className="p-2 border-b border-[#21262D]">
                        <input
                          ref={searchRef}
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="搜尋國家或國碼..."
                          className="w-full h-9 bg-[#0D1117] border border-[#30363D] rounded-lg px-3
                                     text-[13px] text-[#E6EDF3] placeholder:text-[#484F58]
                                     focus:outline-none focus:border-[#F5A623] transition-colors"
                        />
                      </div>
                      {/* List */}
                      <div className="max-h-[240px] overflow-y-auto">
                        {filteredCountries.length === 0 ? (
                          <p className="px-4 py-6 text-[13px] text-[#484F58] text-center">找不到結果</p>
                        ) : filteredCountries.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountry(c); setDropdownOpen(false); setSearch('') }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                                       hover:bg-[#21262D] transition-colors
                                       ${c.code === country.code ? 'bg-[#21262D]' : ''}`}
                          >
                            <span className="text-[18px] w-7 flex-shrink-0">{c.flag}</span>
                            <span className="text-[13px] text-[#E6EDF3] flex-1 truncate">{c.name}</span>
                            <span className="text-[12px] text-[#7D8590] flex-shrink-0">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Local number */}
                <input
                  type="tel"
                  value={localPhone}
                  onChange={e => { setLocalPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && !loading && localPhone && sendOtp()}
                  placeholder="912 345 678"
                  autoFocus
                  className="flex-1 min-w-0 h-11 bg-[#0D1117] border border-[#30363D] rounded-lg px-4
                             text-[15px] text-[#E6EDF3] placeholder:text-[#484F58]
                             focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30
                             transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-[#3D1F1F] border border-[#F85149]/30 rounded-lg px-4 py-3">
                <span className="text-[#F85149] text-[13px] mt-px">!</span>
                <p className="text-[13px] text-[#F85149]">{error}</p>
              </div>
            )}

            <button
              onClick={sendOtp}
              disabled={!localPhone || loading}
              className="w-full h-11 bg-[#F5A623] hover:bg-[#F5A623]/90 text-black text-[14px] font-semibold
                         rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed
                         active:scale-[0.98]"
            >
              {loading ? '傳送中...' : '取得驗證碼'}
            </button>

            <p className="text-center text-[11px] text-[#484F58] mt-5">
              繼續即代表同意{' '}
              <Link href="/terms" className="text-[#8B949E] underline underline-offset-2 hover:text-[#E6EDF3] transition-colors">服務條款</Link>
              {' '}與{' '}
              <Link href="/privacy" className="text-[#8B949E] underline underline-offset-2 hover:text-[#E6EDF3] transition-colors">隱私政策</Link>
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
              className="flex items-center gap-1.5 text-[13px] text-[#8B949E] hover:text-[#E6EDF3]
                         transition-colors mb-6 -ml-1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              返回
            </button>

            <h2 className="text-[17px] font-semibold text-[#E6EDF3] mb-1">輸入驗證碼</h2>
            <p className="text-[13px] text-[#7D8590] mb-6">
              已發送至{' '}
              <span className="text-[#E6EDF3] font-medium">{country.flag} {fullPhone}</span>
            </p>

            <div className="grid grid-cols-6 gap-2 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  className="w-full h-11 bg-[#0D1117] border border-[#30363D] rounded-lg
                             text-center text-[18px] font-bold text-[#E6EDF3]
                             focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30
                             transition-all caret-transparent"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-[#3D1F1F] border border-[#F85149]/30 rounded-lg px-4 py-3">
                <span className="text-[#F85149] text-[13px] mt-px">!</span>
                <p className="text-[13px] text-[#F85149]">{error}</p>
              </div>
            )}

            {loading && (
              <p className="text-[13px] text-[#7D8590] text-center mb-4">驗證中...</p>
            )}

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-[13px] text-[#484F58] tabular-nums">{countdown} 秒後可重新發送</p>
              ) : (
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); sendOtp() }}
                  className="text-[13px] text-[#8B949E] hover:text-[#F5A623] transition-colors"
                >
                  重新發送驗證碼
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-[12px] text-[#484F58] text-center">你的身份對其他用戶完全匿名</p>
    </div>
  )
}
