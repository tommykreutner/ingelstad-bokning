import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendBookingConfirmation } from '@/lib/email'
import crypto from 'crypto'

function generateCode(): string {
  return crypto.randomBytes(2).toString('hex').toUpperCase()
}

function generateId(count: number): string {
  return `IGY-${String(count + 1).padStart(3, '0')}`
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function assignRoom(date: string, capacity: number): Promise<number | null> {
  const prev = prevDay(date)
  const { data: bookedTonight } = await supabaseAdmin
    .from('room_bookings').select('room').eq('date', date)
  const { data: bookedLastNight } = await supabaseAdmin
    .from('room_bookings').select('room').eq('date', prev)
  const { data: closedTonight } = await supabaseAdmin
    .from('closed_rooms').select('room').eq('date', date)

  const usedTonight = new Set(bookedTonight?.map((r: any) => r.room) || [])
  const usedLastNight = new Set(bookedLastNight?.map((r: any) => r.room) || [])
  const closed = new Set((closedTonight || []).flatMap((r: any) => r.room === null ? [1,2,3] : [r.room]))

  // Prefer room free tonight AND free last night AND not closed
  for (let r = 1; r <= capacity; r++) {
    if (!usedTonight.has(r) && !usedLastNight.has(r) && !closed.has(r)) return r
  }
  // Fallback: any free unclosed room
  for (let r = 1; r <= capacity; r++) {
    if (!usedTonight.has(r) && !closed.has(r)) return r
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      studentName, studentEmail, guardianEmail, phone, guardianPhone,
      school, municipality, grade, days, overnight,
      specialFood, otherInfo, slotIds, slotDates,
    } = body

    // Get settings for capacity
    const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
    const capacity = settings?.overnight_capacity || 3

    // Count existing bookings for ID
    const { count } = await supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true })
    const id = generateId(count || 0)
    const code = generateCode()

    // Insert booking
    const { error: bookingError } = await supabaseAdmin.from('bookings').insert({
      id, student_name: studentName, student_email: studentEmail, guardian_phone: guardianPhone,
      guardian_email: guardianEmail, phone, school, municipality, grade,
      days, overnight: overnight || false,
      special_food: specialFood || null, other_info: otherInfo || null, code,
    })
    if (bookingError) throw bookingError

    // Insert booking_slots + increment booked count
    for (const slotId of slotIds) {
      await supabaseAdmin.from('booking_slots').insert({ booking_id: id, slot_id: slotId })
      await supabaseAdmin.rpc('increment_booked', { slot_id: slotId })
    }

    // Handle overnight room assignment
    const roomBookings: Array<{ room: number; date: string }> = []
    if (overnight && slotDates?.length) {
      const dates = [...new Set(slotDates)].sort() as string[]
      const day1 = dates[0]
      const nights = dates.length > 1 ? [prevDay(day1), day1] : [prevDay(day1)]
      for (const night of nights) {
        const room = await assignRoom(night, capacity)
        if (room) {
          await supabaseAdmin.from('room_bookings').insert({ booking_id: id, room, date: night })
          // Also update overnight count
          await supabaseAdmin.from('settings').update({}).eq('id', settings.id) // trigger recalc
          roomBookings.push({ room, date: night })
        }
      }
    }

    // Fetch slot details for email
    const { data: slots } = await supabaseAdmin
      .from('slots')
      .select('id, date, type, program_id, programs(name, icon, email_text)')
      .in('id', slotIds)

    const slotDetails = (slots || []).map((s: any) => ({
      date: s.date,
      type: s.type,
      program_name: s.programs?.name || '',
      program_icon: s.programs?.icon || '',
      program_email_text: s.programs?.email_text || '',
    }))

    // Send confirmation email
    await sendBookingConfirmation({
      id, student_name: studentName, student_email: studentEmail, guardian_phone: guardianPhone,
      guardian_email: guardianEmail, phone, school, municipality, grade,
      overnight: overnight || false, special_food: specialFood, other_info: otherInfo,
      code, slots: slotDetails, room_bookings: roomBookings,
    })

    return NextResponse.json({ id, code })
  } catch (err: any) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get('program')

  let query = supabaseAdmin
    .from('bookings')
    .select(`*, booking_slots(slot_id, slots(date, type, program_id, programs(name, icon)))`)
    .eq('cancelled', false)
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by program if specified
  const filtered = programId
    ? (data || []).filter((b: any) =>
        b.booking_slots?.some((bs: any) => bs.slots?.program_id === programId)
      )
    : data

  return NextResponse.json(filtered)
}

