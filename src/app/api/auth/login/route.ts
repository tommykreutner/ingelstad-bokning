import { NextRequest, NextResponse } from 'next/server'
import { loginStaff, createSessionToken } from '@/lib/auth'
import { clientIp, noteFailure, tooMany } from '@/lib/ratelimit'

const WINDOW = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  let body: any = {}
  try { body = await req.json() } catch { /* tom body */ }
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const ip = clientIp(req)
  const userKey = 'login:' + ip + ':' + username.toLowerCase()
  const ipKey = 'loginip:' + ip
  if (tooMany(userKey, 10, WINDOW) || tooMany(ipKey, 40, WINDOW)) {
    return NextResponse.json({ error: 'För många inloggningsförsök. Vänta en stund och försök igen.' }, { status: 429 })
  }

  const user = username && password ? await loginStaff(username, password) : null
  if (!user) {
    noteFailure(userKey, WINDOW)
    noteFailure(ipKey, WINDOW)
    return NextResponse.json({ error: 'Fel användarnamn eller lösenord' }, { status: 401 })
  }
  // Nyckeln skickas i svaret och sparas bara i webbsidans minne (ingen cookie), så inloggningen
  // fungerar även när webbläsaren blockerar cookies i iframen på ingelstad.nu.
  const token = createSessionToken(user)
  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, program_id: user.program_id, email: user.email },
    token,
  })
}
