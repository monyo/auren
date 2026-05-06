import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function createSessionToken(userId: string, verificationLevel: string): Promise<string> {
  return new SignJWT({ userId, verificationLevel })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<{ userId: string; verificationLevel: string }> {
  const { payload } = await jwtVerify(token, secret)
  return payload as { userId: string; verificationLevel: string }
}
