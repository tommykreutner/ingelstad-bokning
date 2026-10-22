import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Andra roller än admin får bara ändra dessa inställningar (det är vad deras egna sidor skickar).
const NON_ADMIN_KEYS = ['id', 'kitchen_email', 'food_options', 'kitchen_email_text', 'internat_email_text', 'internat_email']

export async function GET() {
  const session = await getSession()
  const { data, error } = await supabaseAdmin.from('settings').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!session) {
    // Obehörig (t.ex. en elev som bokar): bara det bokningsformuläret behöver. Övriga fält finns kvar
    // men är tomma, så webbsidan får samma struktur som förut.
    return NextResponse.json({
      id: data.id,
      school_name: data.school_name,
      overnight_capacity: data.overnight_capacity,
      open_terms: data.open_terms,
      blocked_dates: data.blocked_dates,
      food_options: data.food_options,
      sender_email: '', admin_emails: [], kitchen_email: '', internat_email: '',
      internat_email_text: '', admin_email_text: '', kitchen_email_text: '',
      smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '',
    })
  }
  // Inloggad: allt utom SMTP-lösenordet, som aldrig lämnar servern.
  const { smtp_pass, ...rest } = data
  return NextResponse.json({ ...rest, smtp_pass: '', smtp_pass_set: !!smtp_pass })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const updates = await req.json()
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return NextResponse.json({ error: 'Ogiltig begäran' }, { status: 400 })
  }
  if (session.role !== 'admin') {
    const forbidden = Object.keys(updates).filter(k => !NON_ADMIN_KEYS.includes(k))
    if (forbidden.length) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  // Lösenordet och serveruppgifterna skrivs aldrig över med tomt värde (t.ex. om formuläret skickas blankt).
  delete updates.smtp_pass_set
  if (!updates.smtp_pass) delete updates.smtp_pass
  for (const k of ['smtp_host', 'smtp_port', 'smtp_user']) {
    if (k in updates && !String(updates[k] ?? '').trim()) delete updates[k]
  }
  const { data, error } = await supabaseAdmin
    .from('settings').update(updates).eq('id', updates.id || (await supabaseAdmin.from('settings').select('id').single()).data?.id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { smtp_pass, ...rest } = data as any
  return NextResponse.json({ ...rest, smtp_pass: '', smtp_pass_set: !!smtp_pass })
}
