import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCancellationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Bokningskod saknas' }, { status: 400 })

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, booking_slots(slot_id)')
      .eq('code', code.toUpperCase())
      .eq('cancelled', false)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Bokning hittades inte eller redan avbokad' }, { status: 404 })
    }

    // Decrement booked count on each slot
    for (const bs of booking.booking_slots || []) {
      await supabaseAdmin.rpc('decrement_booked', { slot_id: bs.slot_id })
    }

    // Remove room bookings
    await supabaseAdmin.from('room_bookings').delete().eq('booking_id', booking.id)

    // Mark booking cancelled
    await supabaseAdmin.from('bookings').update({ cancelled: true }).eq('id', booking.id)

    // Send cancellation email
    await sendCancellationEmail({
      id: booking.id,
      student_name: booking.student_name,
      student_email: booking.student_email,
      guardian_email: booking.guardian_email,
      code: booking.code,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('kod')
  if (!code) return NextResponse.json({ error: 'Kod saknas' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, student_name, student_email, school, grade, days, overnight, code, cancelled, booking_slots(slot_id, slots(date, type, programs(name, icon)))')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) return NextResponse.json({ error: 'Bokning hittades inte' }, { status: 404 })
  return NextResponse.json(data)
}
