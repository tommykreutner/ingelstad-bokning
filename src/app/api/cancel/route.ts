import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCancellationEmail } from '@/lib/email'
import { clientIp, noteFailure, tooMany } from '@/lib/ratelimit'

const WINDOW = 15 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Bokningskod saknas' }, { status: 400 })
    // Skydd mot gissning av bokningskoder: max 15 felaktiga försök per 15 minuter och IP-adress
    const ipKey = 'cancel:' + clientIp(req)
    if (tooMany(ipKey, 15, WINDOW)) {
      return NextResponse.json({ error: 'För många försök. Vänta en stund och försök igen.' }, { status: 429 })
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, booking_slots(slot_id, slots(date, type, program_id, programs(name, icon)))')
      .eq('code', code.toUpperCase())
      .eq('cancelled', false)
      .single()

    if (error || !booking) {
      noteFailure(ipKey, WINDOW)
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

    const cancelSlots = (booking.booking_slots || []).map((bs: any) => ({
      date: bs.slots?.date, type: bs.slots?.type, program_id: bs.slots?.program_id,
      program_name: bs.slots?.programs?.name || '', program_icon: bs.slots?.programs?.icon || '',
    })).filter((s: any) => s.date)

    // Send cancellation email
    await sendCancellationEmail({
      id: booking.id,
      student_name: booking.student_name,
      student_email: booking.student_email,
      guardian_email: booking.guardian_email,
      code: booking.code,
      overnight: booking.overnight,
      special_food: booking.special_food,
      slots: cancelSlots,
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
  const ipKey = 'cancel:' + clientIp(req)
  if (tooMany(ipKey, 15, WINDOW)) {
    return NextResponse.json({ error: 'För många försök. Vänta en stund och försök igen.' }, { status: 429 })
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, student_name, days, overnight, code, cancelled, booking_slots(slot_id, slots(date, type, programs(name, icon)))')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    noteFailure(ipKey, WINDOW)
    return NextResponse.json({ error: 'Bokning hittades inte' }, { status: 404 })
  }
  // Bara förnamnet och schemat visas, inga kontaktuppgifter
  return NextResponse.json({ ...data, student_name: String(data.student_name || '').split(' ')[0] })
}
