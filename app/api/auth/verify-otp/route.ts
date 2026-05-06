import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gt } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { db } from '@/lib/db'
import { otpCodes, verifiedIdentities, userTokens, users } from '@/lib/db/schema'
import { normalizePhone, hashPhone } from '@/lib/auth/phone'
import { verifyOtp } from '@/lib/auth/otp'
import { createSessionToken } from '@/lib/auth/session'

function randomNickname(): string {
  const adjectives = ['Swift', 'Quiet', 'Bold', 'Calm', 'Keen', 'Wise', 'Bright', 'Clear']
  const nouns = ['River', 'Stone', 'Cloud', 'Wind', 'Star', 'Wave', 'Peak', 'Field']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}${noun}${num}`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const phone: string | undefined = body?.phone
  const code: string | undefined = body?.code

  if (!phone || !code) {
    return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const phoneHash = hashPhone(normalized)
  const now = new Date()

  // 找有效的 OTP
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneHash, phoneHash), gt(otpCodes.expiresAt, now)))
    .limit(1)

  if (!otp) {
    return NextResponse.json({ error: 'Code expired or not found. Request a new one.' }, { status: 400 })
  }

  // 超過 5 次嘗試就鎖住
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 400 })
  }

  if (!verifyOtp(code, otp.code)) {
    await db
      .update(otpCodes)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(otpCodes.id, otp.id))
    return NextResponse.json({ error: 'Incorrect code' }, { status: 400 })
  }

  // 驗證成功，刪除 OTP
  await db.delete(otpCodes).where(eq(otpCodes.id, otp.id))

  // 找或建立 verified_identity
  let [identity] = await db
    .select()
    .from(verifiedIdentities)
    .where(eq(verifiedIdentities.phoneHash, phoneHash))
    .limit(1)

  if (!identity) {
    const newId = uuidv7()
    await db.insert(verifiedIdentities).values({
      id: newId,
      phoneHash,
      verificationLevel: 'level_1',
    })
    ;[identity] = await db
      .select()
      .from(verifiedIdentities)
      .where(eq(verifiedIdentities.id, newId))
      .limit(1)
  }

  // 建立 session token（30 天有效）
  const tokenId = uuidv7()
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(userTokens).values({
    id: tokenId,
    identityId: identity.id,
    expiresAt: tokenExpiresAt,
  })

  // 找或建立 users（以 identity.id 作為 user id）
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, identity.id))
    .limit(1)

  if (!existingUser) {
    await db.insert(users).values({
      id: identity.id,
      nickname: randomNickname(),
      verificationLevel: identity.verificationLevel,
    })
  }

  const jwt = await createSessionToken(identity.id, identity.verificationLevel)

  return NextResponse.json({
    token: jwt,
    userId: identity.id,
    verificationLevel: identity.verificationLevel,
    isNewUser: !existingUser,
  })
}
