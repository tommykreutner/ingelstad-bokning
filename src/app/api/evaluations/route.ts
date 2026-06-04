import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const bookingId = searchParams.get('booking_id')
  if (code) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, booking_slots(slot_id, slots(date, type, program_id, programs(name, icon, eval_questions)))')
      .eq('code', code)
      .eq('cancelled', false)
      .single()
    if (!booking) return NextResponse.json({ error: 'Bokning hittades inte' }, { status: 404 })
    const submitted_at_cutoff = new Date()
    submitted_at_cutoff.setDate(submitted_at_cutoff.getDate() - 14)
    const { data: existing } = await supabaseAdmin
      .from('evaluations')
      .select('id')
      .eq('booking_id', booking.id)
      .single()
    return NextResponse.json({ booking, already_submitted: !!existing })
  }
  if (bookingId) {
    const { data } = await supabaseAdmin.from('evaluations').select('*').eq('booking_id', bookingId).single()
    return NextResponse.json(data || null)
  }
  const { data, error } = await supabaseAdmin.from('evaluations').select('*, bookings(student_name, school, grade)').order('submitted_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { booking_id, general_score, general_comment, program_scores, would_apply } = body
  const { data: existing } = await supabaseAdmin.from('evaluations').select('id').eq('booking_id', booking_id).single()
  if (existing) return NextResponse.json({ error: 'Utvärdering redan inlämnad' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('evaluations').insert({
    booking_id, general_score, general_comment, program_scores, would_apply
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
