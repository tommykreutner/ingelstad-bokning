import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { subject, body } = await req.json()
    const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
    const adminEmails = settings?.admin_emails || []
    if (!adminEmails.length) return NextResponse.json({ ok: true })
    await sendAdminNotification({ to: adminEmails, subject, body })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
