import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { allowedTrackIds, campAccess } from '@/lib/campauth'
import { getCampConfig } from '@/lib/campdata'
import { sendCampBooked, sendCampCancelled, sendCampFinalBatch } from '@/lib/campmail'
import { cleanText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'
const MAX_PER_CALL = 15

async function scopeTracks(session: any) {
  const access = await campAccess(session)
  if (!access) return null
  const { data } = await supabaseAdmin.from('camp_tracks').select('*')
  const tracks = (data || []) as any[]
  return { access, tracks, allowed: allowedTrackIds(access, tracks) }
}

// Anmälningar, filtrerade efter vad personen får se.
export async function GET() {
  const s = await scopeTracks(await getSession())
  if (!s) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  if (!s.allowed.length) return NextResponse.json([])
  const { data, error } = await supabaseAdmin.from('camp_registrations').select('*').in('track_id', s.allowed).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Senaste mailstatus per anmälan, så att personalen ser om ett bokningsmail eller en bekräftelse inte gick fram
  const ids = ((data || []) as any[]).map(r => r.id)
  const { data: logs } = ids.length
    ? await supabaseAdmin.from('camp_mail_log').select('registration_id, kind, error, created_at').in('registration_id', ids).order('created_at', { ascending: false })
    : { data: [] as any[] }
  const latest: Record<string, Record<string, string>> = {}
  for (const l of (logs || []) as any[]) {
    latest[l.registration_id] = latest[l.registration_id] || {}
    if (!(l.kind in latest[l.registration_id])) latest[l.registration_id][l.kind] = l.error ? 'fel' : 'ok'
  }
  return NextResponse.json(((data || []) as any[]).map(r => {
    return { ...r, mail_booked: latest[r.id]?.bokad || null, mail_final: latest[r.id]?.slutgiltig || null }
  }))
}

export async function PATCH(req: NextRequest) {
  const s = await scopeTracks(await getSession())
  if (!s) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  if (!s.access.write) return NextResponse.json({ error: 'Du har bara läsrättigheter här' }, { status: 403 })
  const body = await req.json()
  const cfg = await getCampConfig()
  const trackOf = (id: string) => s.tracks.find(t => t.id === id)

  // Hämta de angivna anmälningarna och släng allt personen inte har rätt till
  const ids: string[] = (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []).map((x: any) => String(x)).slice(0, MAX_PER_CALL)
  if (!ids.length) return NextResponse.json({ error: 'Inga anmälningar valda' }, { status: 400 })
  const { data: rows } = await supabaseAdmin.from('camp_registrations').select('*').in('id', ids)
  const regs = ((rows || []) as any[]).filter(r => s.allowed.includes(r.track_id))
  if (!regs.length) return NextResponse.json({ error: 'Hittade inga anmälningar du har rätt till' }, { status: 404 })

  if (body.action === 'confirm') {
    const text = cleanText(body.text || cfg?.final_text || '', 5000)
    if (!text) return NextResponse.json({ error: 'Skriv ett meddelande att skicka (eller fyll i standardtext under inställningar).' }, { status: 400 })
    const active = regs.filter(r => r.status !== 'avbokad')
    const results = await sendCampFinalBatch(active.map(r => ({ reg: r, track: trackOf(r.track_id) })), text, cfg, body.includeInfo === true)
    const okIds = results.filter(r => r.ok).map(r => r.id)
    if (okIds.length) await supabaseAdmin.from('camp_registrations').update({ status: 'bekraftad', confirmation_sent_at: new Date().toISOString() }).in('id', okIds)
    return NextResponse.json({ results })
  }

  if (body.action === 'cancel') {
    const results: any[] = []
    for (const r of regs) {
      if (r.status === 'avbokad') { results.push({ id: r.id, ok: true }); continue }
      const { data: upd } = await supabaseAdmin.from('camp_registrations')
        .update({ status: 'avbokad', cancelled_at: new Date().toISOString() }).eq('id', r.id).neq('status', 'avbokad').select()
      if (upd && upd.length) { try { await sendCampCancelled(r, trackOf(r.track_id), cfg) } catch (e: any) { console.error('Avbokningsmail:', e?.message) } }
      results.push({ id: r.id, ok: true })
    }
    return NextResponse.json({ results })
  }

  if (body.action === 'resend_booked') {
    const results: any[] = []
    for (const r of regs) {
      if (r.status === 'avbokad') continue
      const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, '')
      const x: any = await sendCampBooked(r, trackOf(r.track_id), cfg, base)
      results.push({ id: r.id, ok: x.ok, error: x.error })
    }
    return NextResponse.json({ results })
  }

  return NextResponse.json({ error: 'Okänd åtgärd' }, { status: 400 })
}
