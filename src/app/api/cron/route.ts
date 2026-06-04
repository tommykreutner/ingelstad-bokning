import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendFollowUpEmail } from '@/lib/email'

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Find bookings where:
  // 1. follow_up_sent is false
  // 2. Last slot date is before today (visit has passed)
  // 3. Either all programs have marked attendance OR it's been 7 days since last slot
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('*, booking_slots(slot_id, slots(date, program_id))')
    .eq('cancelled', false)
    .eq('follow_up_sent', false)

  if (!bookings?.length) return NextResponse.json({ processed: 0 })

  let processed = 0

  for (const booking of bookings) {
    const slots = booking.booking_slots?.map((bs: any) => bs.slots).filter(Boolean) || []
    const dates = slots.map((s: any) => s.date).sort()
    const lastDate = dates[dates.length - 1]
    if (!lastDate || lastDate >= today) continue

    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)

    // Get attendance records for this booking
    const programIds = [...new Set(slots.map((s: any) => s.program_id).filter(Boolean))] as string[]
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('booking_id', booking.id)

    const allMarked = programIds.length > 0 && programIds.every((pid: string) =>
      attendance?.find((a: any) => a.program_id === pid)
    )
    const atLeastOnePresent = attendance?.some((a: any) => a.status === 'present')
    const allAbsent = (attendance?.length ?? 0) > 0 && attendance?.every((a: any) => a.status === 'absent')

    // Send if: (all marked AND at least one present) OR (7 days passed AND at least one present)
    // Never send if all absent
    const shouldSend = !allAbsent && atLeastOnePresent && (allMarked || daysSince >= 7)

    if (shouldSend) {
      await sendFollowUpEmail({
        id: booking.id,
        student_name: booking.student_name,
        student_email: booking.student_email,
        guardian_email: booking.guardian_email,
        code: booking.code,
      })
      await supabaseAdmin.from('bookings').update({ follow_up_sent: true }).eq('id', booking.id)
      processed++
    }
  }

  return NextResponse.json({ processed, checked: bookings.length })
}

