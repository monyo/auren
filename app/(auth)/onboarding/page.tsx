'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => router.push('/'), 2500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1117] px-5">
      <div className="w-full max-w-[360px] bg-[#161B22] border border-[#21262D] rounded-2xl p-10 text-center">

        <div className="w-14 h-14 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30
                        flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-[28px] font-black tracking-[4px] text-[#E6EDF3] mb-2">
          AU<span className="text-[#F5A623]">R</span>EN
        </h1>
        <p className="text-[15px] text-[#8B949E] mb-6">驗證完成，歡迎加入</p>

        <div className="bg-[#0D1117] border border-[#21262D] rounded-xl px-5 py-4 space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3FB950] flex-shrink-0" />
            <p className="text-[13px] text-[#8B949E]">帳號已通過真人驗證</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3FB950] flex-shrink-0" />
            <p className="text-[13px] text-[#8B949E]">你的身份對其他用戶完全匿名</p>
          </div>
        </div>
      </div>
    </div>
  )
}
