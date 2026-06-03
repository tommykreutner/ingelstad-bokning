import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('booking_id')
  let query = supabaseAdmin.from('attendance').select('*')
  if (bookingId) query = query.eq('booking_id', bookingId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { booking_id, program_id, status } = await req.json()
  // Upsert attendance record
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .upsert({ booking_id, program_id, status, marked_by: session.id, marked_at: new Date().toISOString() },
      { onConflict: 'booking_id,program_id' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
