import { NextRequest, NextResponse } from 'next/server'
import { loginStaff, createSessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const user = await loginStaff(username, password)
  if (!user) {
    return NextResponse.json({ error: 'Fel användarnamn eller lösenord' }, { status: 401 })
  }
  const token = createSessionToken(user)
  const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, program_id: user.program_id, email: user.email } })
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dagar
    path: '/',
  })
  return res
}
