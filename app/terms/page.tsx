import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0D1117] px-5 py-12 max-w-[680px] mx-auto">
      <div className="mb-10">
        <Link href="/verify" className="text-[13px] text-[#7D8590] hover:text-[#E6EDF3] transition-colors">
          ← 返回
        </Link>
      </div>

      <h1 className="text-[28px] font-black tracking-[4px] text-[#E6EDF3] mb-2">
        AU<span className="text-[#F5A623]">R</span>EN
      </h1>
      <h2 className="text-[20px] font-bold text-[#E6EDF3] mb-2">服務條款</h2>
      <p className="text-[13px] text-[#484F58] mb-10">最後更新：2025 年</p>

      <div className="space-y-8 text-[14px] text-[#8B949E] leading-relaxed">

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">1. 服務說明</h3>
          <p>AUREN 是一個要求真人驗證的匿名討論平台。使用者需透過手機門號完成身份驗證，方可發文與回覆。平台對其他用戶保持完全匿名，但對平台持有已驗證的唯一身份。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">2. 使用資格</h3>
          <p>使用本服務需年滿 18 歲，並持有有效的手機門號。每人僅限一個帳號，禁止建立多個帳號規避限制。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">3. 使用者行為規範</h3>
          <p className="mb-3">使用本平台時，您同意不得：</p>
          <ul className="space-y-2 pl-4">
            {[
              '發布仇恨言論、騷擾或針對個人的攻擊性內容',
              '散布不實資訊或刻意誤導的內容',
              '進行詐騙、釣魚或其他惡意行為',
              '嘗試破解或繞過平台的驗證機制',
              '以程式化方式大量操縱討論',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#3D444D] mt-0.5 flex-shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">4. 內容所有權</h3>
          <p>您對自己發布的內容保有著作權。您授予 AUREN 在平台上展示、傳播您的內容的非獨家授權。您可以隨時刪除自己的內容。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">5. 帳號暫停與終止</h3>
          <p>違反本條款可能導致帳號被暫停或永久封禁。由於驗證機制的設計，封禁與手機門號綁定，同一門號無法重新申請。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">6. 免責聲明</h3>
          <p>AUREN 不對用戶發布的內容負責。我們提供平台基礎設施，但不保證內容的準確性或適當性。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">7. 條款修改</h3>
          <p>我們保留修改本條款的權利。重大變更會提前通知。繼續使用本服務視為接受更新後的條款。</p>
        </section>

        <div className="pt-6 border-t border-[#21262D]">
          <p className="text-[12px] text-[#484F58]">如有疑問，請聯絡 legal@auren.app</p>
        </div>
      </div>
    </div>
  )
}
