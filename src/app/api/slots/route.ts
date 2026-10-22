import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get('program')
  let query = supabaseAdmin.from('slots').select('*').order('date').order('type')
  if (programId) query = query.eq('program_id', programId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Elever som bokar skapar själva tider (halvdagar och tider i öppna program) när de bekräftar sin bokning,
// så obehöriga får skapa tider, men bara rimliga: kända program, giltig typ, nära datum och rimlig kapacitet.
const SLOT_TYPES = ['hel', 'fm', 'em']
function validDate(d: any): boolean {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = Date.parse(d + 'T12:00:00Z')
  if (isNaN(t)) return false
  const now = Date.now()
  return t >= now - 3 * 86400000 && t <= now + 550 * 86400000
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  const body = await req.json()
  const slots = body.slots || [{ programId: body.programId, date: body.date, type: body.type, capacity: body.capacity }]
  if (!Array.isArray(slots) || !slots.length) return NextResponse.json({ error: 'Saknar tider' }, { status: 400 })

  if (!session) {
    if (slots.length > 6) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
    const { data: progs } = await supabaseAdmin.from('programs').select('id')
    const known = new Set((progs || []).map((p: any) => p.id))
    for (const s of slots) {
      const cap = s.capacity == null ? 10 : Number(s.capacity)
      if (!known.has(s.programId) || !SLOT_TYPES.includes(s.type) || !validDate(s.date) || !Number.isInteger(cap) || cap < 1 || cap > 60) {
        return NextResponse.json({ error: 'Ogiltig tid' }, { status: 400 })
      }
    }
  }

  const inserts = slots.map((s: any) => ({ program_id: s.programId, date: s.date, type: s.type, capacity: s.capacity || 10, booked: 0 }))
  const { data, error } = await supabaseAdmin.from('slots').insert(inserts).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slots: data })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { id, capacity } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('slots').update({ capacity }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID saknas' }, { status: 400 })
  if (!session) {
    // Bokningsflödet tar bort en tom heldagstid när den delas upp i förmiddag/eftermiddag. Övrigt kräver inloggning.
    const { data: slot } = await supabaseAdmin.from('slots').select('id, type').eq('id', id).maybeSingle()
    if (!slot || slot.type !== 'hel') return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }
  const { data: bs } = await supabaseAdmin.from('booking_slots').select('*').eq('slot_id', id)
  if (bs?.length) return NextResponse.json({ error: 'Kan inte ta bort tid med aktiva bokningar' }, { status: 400 })
  const { error } = await supabaseAdmin.from('slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
