import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('closed_rooms').select('*').order('date')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const mapped = (data || []).map(r => ({ room: r.room === null ? 'all' : r.room, date: r.date }))
  return NextResponse.json(mapped)
}

export async function POST(req: Request) {
  const { rooms } = await req.json()
  // rooms: [{room, date}] — room is 'all' or a number
  if (!Array.isArray(rooms) || !rooms.length) {
    return NextResponse.json({ error: 'Saknar data' }, { status: 400 })
  }
  const rows = rooms.map((r: any) => ({
    room: r.room === 'all' ? null : parseInt(r.room),
    date: r.date,
  }))
  const { error } = await supabaseAdmin.from('closed_rooms').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room')
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Saknar datum' }, { status: 400 })

  let query = supabaseAdmin.from('closed_rooms').delete().eq('date', date)
  if (room === 'all') query = query.is('room', null)
  else query = query.eq('room', parseInt(room || '0'))

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
