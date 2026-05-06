import Link from 'next/link'

export default function PrivacyPage() {
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
      <h2 className="text-[20px] font-bold text-[#E6EDF3] mb-2">隱私政策</h2>
      <p className="text-[13px] text-[#484F58] mb-10">最後更新：2025 年</p>

      <div className="space-y-8 text-[14px] text-[#8B949E] leading-relaxed">

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">核心原則</h3>
          <p>AUREN 的設計讓平台本身在技術上也難以將內容連回真實身份。驗證 Token 有時效性，過期後即使我們自己也無法追溯。我們收集的資料以維持服務運作所需的最小限度為原則。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">我們收集的資料</h3>
          <div className="space-y-4">
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[13px] font-semibold text-[#C9D1D9] mb-1">驗證服務</p>
              <p className="text-[12px]">手機號碼的單向雜湊值（無法還原為原始號碼）。驗證完成後，原始號碼不會被保留。</p>
            </div>
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[13px] font-semibold text-[#C9D1D9] mb-1">論壇服務</p>
              <p className="text-[12px]">匿名 Token（與手機號碼分離儲存）、發文內容、時間戳記、裝置類型。</p>
            </div>
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[13px] font-semibold text-[#C9D1D9] mb-1">我們不收集</p>
              <p className="text-[12px]">真實姓名、電子郵件、精確位置、瀏覽行為追蹤、廣告識別碼。</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">身份與內容的分離</h3>
          <p className="mb-3">驗證服務與論壇服務在架構上分離：</p>
          <div className="bg-[#0D1117] border border-[#21262D] rounded-xl p-4 font-mono text-[12px] text-[#7D8590] space-y-1">
            <p>驗證服務　→　手機號碼雜湊 → Token</p>
            <p>論壇服務　→　只認識 Token，不知道手機號碼</p>
            <p className="text-[#484F58] pt-1">Token 30 天後過期，過期後無法追溯</p>
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">資料存放位置</h3>
          <p>身份驗證資料存放於境外伺服器（美國或新加坡）。即使面對台灣境內的法律要求，資料也無法被直接取得，需透過境外民主法律框架處理。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">資料保留期限</h3>
          <ul className="space-y-2 pl-4">
            {[
              'OTP 驗證碼：5 分鐘後自動刪除',
              '登入 Token：30 天後過期',
              '發文內容：帳號存續期間，或用戶主動刪除後',
              '手機號碼雜湊：帳號存續期間（用於防止重複申請）',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#3D444D] mt-0.5 flex-shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">第三方服務</h3>
          <p>我們使用 Twilio 發送驗證簡訊。Twilio 會在其系統中暫存發送記錄，適用其自身隱私政策。我們不與其他第三方共享用戶資料。</p>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[#C9D1D9] mb-3">您的權利</h3>
          <p>您可以要求刪除帳號及相關資料。由於架構設計，帳號刪除後，過去的發文內容將與任何可識別資訊永久分離。</p>
        </section>

        <div className="pt-6 border-t border-[#21262D]">
          <p className="text-[12px] text-[#484F58]">如有隱私相關疑問，請聯絡 privacy@auren.app</p>
        </div>
      </div>
    </div>
  )
}
