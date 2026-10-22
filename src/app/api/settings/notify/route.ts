import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminNotification } from '@/lib/email'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
    const { subject, body } = await req.json()
    const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
    const adminEmails = settings?.admin_emails || []
    if (!adminEmails.length) return NextResponse.json({ ok: true })
    await sendAdminNotification({ to: adminEmails, subject: String(subject ?? '').slice(0, 200), body: String(body ?? '').slice(0, 20000) })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
