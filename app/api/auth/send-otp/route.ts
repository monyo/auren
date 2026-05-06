import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { db } from '@/lib/db'
import { otpCodes } from '@/lib/db/schema'
import { normalizePhone, hashPhone } from '@/lib/auth/phone'
import { generateOtp, hashOtp } from '@/lib/auth/otp'
import redis from '@/lib/redis'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const phone: string | undefined = body?.phone

  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  if (!/^\+\d{7,15}$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid phone number format. Include country code, e.g. +886912345678' }, { status: 400 })
  }

  const phoneHash = hashPhone(normalized)

  // 每個號碼 10 分鐘內最多發 3 次
  const rateLimitKey = `otp:rate:${phoneHash}`
  const count = await redis.incr(rateLimitKey)
  if (count === 1) await redis.expire(rateLimitKey, 600)
  if (count > 3) {
    return NextResponse.json({ error: 'Too many requests. Try again in 10 minutes.' }, { status: 429 })
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 分鐘

  await db.delete(otpCodes).where(eq(otpCodes.phoneHash, phoneHash))
  await db.insert(otpCodes).values({
    id: uuidv7(),
    phoneHash,
    code: hashOtp(code),
    expiresAt,
  })

  if (process.env.TWILIO_ACCOUNT_SID) {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body: `Your AUREN code: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: normalized,
    })
  } else {
    // Dev mode: log to console
    console.log(`[DEV] OTP for ${normalized}: ${code}`)
  }

  return NextResponse.json({ success: true })
}
