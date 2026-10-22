import { supabaseAdmin } from './supabase'
import { headers } from 'next/headers'
import crypto from 'crypto'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'ingelstad-salt').digest('hex')
}

export async function loginStaff(username: string, password: string) {
  const hash = hashPassword(password)
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('username', username)
    .eq('password_hash', hash)
    .single()
  if (error || !data) return null
  return data
}

// ---- Signerad inloggningsnyckel (token) ----
// Nyckeln innehåller användaren och ett utgångsdatum och är signerad med HMAC, så den går inte att
// förfalska. Hemligheten tas från SESSION_SECRET om den finns, annars från SUPABASE_SERVICE_ROLE_KEY
// (som redan är hemlig och bara finns på servern).
function sessionSecret(): string | null {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || base.length < 16) return null
  return crypto.createHash('sha256').update('ingelstad-session-v1:' + base).digest('hex')
}

const SESSION_MS = 7 * 24 * 60 * 60 * 1000 // 7 dagar, som tidigare

export function createSessionToken(user: any): string {
  const secret = sessionSecret()
  if (!secret) throw new Error('Serverns sessionshemlighet saknas')
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    program_id: user.program_id,
    email: user.email,
    exp: Date.now() + SESSION_MS,
  })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update('v1.' + payload).digest('base64url')
  return `v1.${payload}.${sig}`
}

export function verifySessionToken(token: string): any | null {
  const secret = sessionSecret()
  if (!secret || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const expected = crypto.createHmac('sha256', secret).update('v1.' + parts[1]).digest()
  let given: Buffer
  try { given = Buffer.from(parts[2], 'base64url') } catch { return null }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// Läser nyckeln från headern "Authorization: Bearer <token>" (skickas av appen efter inloggning).
export async function getSession() {
  const h = await headers()
  const m = /^Bearer\s+(\S+)$/i.exec(h.get('authorization') || '')
  if (!m) return null
  return verifySessionToken(m[1])
}
