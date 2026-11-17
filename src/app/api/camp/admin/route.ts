import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { allowedTrackIds, campAccess } from '@/lib/campauth'
import { campStatus, countsByTrack, getCampConfig } from '@/lib/campdata'
import { cleanText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

// Inställningar och inriktningar till admin-fliken (inloggad personal).
export async function GET() {
  const access = await campAccess(await getSession())
  if (!access) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  const cfg = await getCampConfig()
  const { data: tracks } = await supabaseAdmin.from('camp_tracks').select('*').order('sort').order('name')
  const { taken, confirmed } = await countsByTrack()
  const list = (tracks || []) as any[]
  return NextResponse.json({
    config: cfg ? { ...cfg, status: campStatus(cfg) } : null,
    tracks: list.map(t => ({ ...t, taken: taken[t.id] || 0, confirmed: confirmed[t.id] || 0 })),
    access: { write: access.write, admin: access.admin, role: access.role, trackIds: allowedTrackIds(access, list) },
  })
}

const CONFIG_TEXT: Record<string, number> = {
  title: 100, dates_text: 200, intro_text: 3000, grade_options: 200, shirt_sizes: 200, booked_text: 5000, final_text: 5000, billing_text: 1500, info_text: 8000,
}

// Ändra inställningar (bara admin)
export async function PATCH(req: NextRequest) {
  const access = await campAccess(await getSession())
  if (!access?.admin) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  const body = (await req.json()).config || {}
  const upd: any = {}
  for (const [k, max] of Object.entries(CONFIG_TEXT)) if (k in body) upd[k] = cleanText(body[k], max)
  if ('title' in upd && !upd.title) upd.title = 'SummerCamp'
  if ('open' in body) upd.open = body.open === true
  for (const k of ['opens_at', 'closes_at']) {
    if (k in body) {
      if (!body[k]) upd[k] = null
      else { const d = new Date(body[k]); if (isNaN(d.getTime())) return NextResponse.json({ error: 'Ogiltigt datum' }, { status: 400 }); upd[k] = d.toISOString() }
    }
  }
  upd.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('camp_config').update(upd).eq('id', 1).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Skapa eller ändra en inriktning (bara admin)
export async function POST(req: NextRequest) {
  const access = await campAccess(await getSession())
  if (!access?.admin) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  const t = (await req.json()).track || {}
  const name = cleanText(t.name, 60)
  if (!name) return NextResponse.json({ error: 'Namn saknas' }, { status: 400 })
  const capacity = Math.max(0, Math.min(500, parseInt(t.capacity, 10)))
  if (!Number.isFinite(capacity)) return NextResponse.json({ error: 'Ogiltigt antal platser' }, { status: 400 })
  const row: any = {
    name, icon: cleanText(t.icon, 8), description: cleanText(t.description, 1000), gear_text: cleanText(t.gear_text, 800), own_animal_text: cleanText(t.own_animal_text, 150), capacity,
    program_id: t.program_id ? cleanText(t.program_id, 60) : null,
    sort: Number.isFinite(parseInt(t.sort, 10)) ? parseInt(t.sort, 10) : 0,
    active: t.active !== false,
  }
  if (t.id) {
    const { data, error } = await supabaseAdmin.from('camp_tracks').update(row).eq('id', cleanText(t.id, 60)).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const slug = name.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'insats'
  const { data, error } = await supabaseAdmin.from('camp_tracks').insert({ ...row, id: slug + '-' + Math.random().toString(36).slice(2, 6) }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Ta bort en inriktning: finns det anmälningar döljs den i stället (så att inget försvinner)
export async function DELETE(req: NextRequest) {
  const access = await campAccess(await getSession())
  if (!access?.admin) return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('track') || ''
  if (!id) return NextResponse.json({ error: 'Saknar id' }, { status: 400 })
  const { count } = await supabaseAdmin.from('camp_registrations').select('*', { count: 'exact', head: true }).eq('track_id', id)
  if ((count || 0) > 0) {
    await supabaseAdmin.from('camp_tracks').update({ active: false }).eq('id', id)
    return NextResponse.json({ ok: true, hidden: true })
  }
  await supabaseAdmin.from('camp_tracks').delete().eq('id', id)
  return NextResponse.json({ ok: true, hidden: false })
}
