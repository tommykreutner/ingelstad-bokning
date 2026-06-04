import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendFollowUpEmail } from '@/lib/email'

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)

  // Hitta bokningar där besöket passerat, uppföljning ej skickad, ej redan utvärderad
  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, student_name, student_email, guardian_email,
      follow_up_sent,
      booking_slots ( slots ( date ) )
    `)
    .eq('follow_up_sent', false)

  if (error) {
    console.error('CRON FEL:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const booking of (bookings || [])) {
    // Hitta senaste slot-datum för bokningen
    const dates = (booking.booking_slots || [])
      .map((bs: any) => bs.slots?.date)
      .filter(Boolean)
      .sort()
    const lastDate = dates[dates.length - 1]

    // Skicka bara om besöket passerat (minst 1 dag sedan)
    if (!lastDate || lastDate >= today) {
      skipped++
      continue
    }

    // Kolla om eleven redan svarat
    const { data: existing } = await supabaseAdmin
      .from('eval_answers')
      .select('id')
      .eq('booking_id', booking.id)
      .limit(1)

    if (existing && existing.length > 0) {
      // Redan svarat — markera som skickad ändå så vi inte kollar igen
      await supabaseAdmin
        .from('bookings')
        .update({ follow_up_sent: true })
        .eq('id', booking.id)
      skipped++
      continue
    }

    // Skicka uppföljningsmail med boknings-id som kod
    try {
      await sendFollowUpEmail({...booking, code: booking.id})
      await supabaseAdmin
        .from('bookings')
        .update({ follow_up_sent: true })
        .eq('id', booking.id)
      sent++
    } catch (err: any) {
      console.error('CRON SMTP FEL för', booking.id, err?.message)
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
