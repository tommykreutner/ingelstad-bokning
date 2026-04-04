import { supabaseAdmin } from './supabase'
import { cookies } from 'next/headers'
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

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie?.value) return null
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function createSessionToken(user: any): string {
  return Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    program_id: user.program_id,
    email: user.email,
  })).toString('base64')
}
