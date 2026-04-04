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

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { programId, date, type, capacity } = await req.json()
  const { data, error } = await supabaseAdmin.from('slots').insert({
    program_id: programId, date, type, capacity: capacity || 10, booked: 0,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID saknas' }, { status: 400 })

  // Check no active bookings
  const { data: bs } = await supabaseAdmin.from('booking_slots').select('*').eq('slot_id', id)
  if (bs?.length) return NextResponse.json({ error: 'Kan inte ta bort tid med aktiva bokningar' }, { status: 400 })

  const { error } = await supabaseAdmin.from('slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
