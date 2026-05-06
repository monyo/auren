import { createHash } from 'crypto'

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '')
}

export function hashPhone(phone: string): string {
  const salt = process.env.PHONE_HASH_SALT ?? 'auren-dev-salt'
  return createHash('sha256').update(salt + phone).digest('hex')
}
