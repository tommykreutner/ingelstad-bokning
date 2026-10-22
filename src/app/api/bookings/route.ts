import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendBookingConfirmation } from '@/lib/email'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { cleanText, cleanEmail } from '@/lib/sanitize'

// 8 tecken ger över fyra miljarder möjligheter (tidigare 4 tecken = 65 536, vilket gick att gissa).
function generateCode(bytes = 4): string {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase()
}

function generateId(count: number): string {
  return `IGY-${String(count + 1).padStart(3, '0')}`
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function assignRoom(date: string, capacity: number, existingRooms: Array<{room: number, date: string}> = []): Promise<number | null> {
  const prev = prevDay(date)
  const { data: bookedTonight } = await supabaseAdmin
    .from('room_bookings').select('room').eq('date', date)
  const { data: bookedLastNight } = await supabaseAdmin
    .from('room_bookings').select('room').eq('date', prev)
  const { data: closedTonight } = await supabaseAdmin
    .from('closed_rooms').select('room').eq('date', date)

  // Check if this booking already has a room assigned for a previous night
  const myRoom = existingRooms.find(r => r.date === prev)?.room
  if (myRoom) return myRoom // Keep same room for consecutive nights

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
      days, overnight, slotIds, slotDates,
    } = body
    if (!Array.isArray(slotIds) || !slotIds.length) {
      return NextResponse.json({ error: 'Inga tider valda' }, { status: 400 })
    }

    // Rensa texten som eleven fyllt i (inga HTML-taggar eller citattecken som kan störa personalens vyer).
    // Saknade fält lämnas som de var, så databasen får samma värden som förut.
    const ct = (v: any, max: number) => (v == null ? v : cleanText(v, max))
    const studentName = ct(body.studentName, 120)
    const phone = ct(body.phone, 40)
    const guardianPhone = ct(body.guardianPhone, 40)
    const school = ct(body.school, 150)
    const municipality = ct(body.municipality, 100)
    const grade = ct(body.grade, 20)
    const specialFood = ct(body.specialFood, 500)
    const otherInfo = ct(body.otherInfo, 2000)
    const studentEmail = body.studentEmail == null ? body.studentEmail : cleanEmail(body.studentEmail)
    const guardianEmail = body.guardianEmail == null ? body.guardianEmail : cleanEmail(body.guardianEmail)
    if (!studentName) return NextResponse.json({ error: 'Namn saknas' }, { status: 400 })
    if (studentEmail === null || guardianEmail === null) {
      return NextResponse.json({ error: 'Ogiltig e-postadress' }, { status: 400 })
    }

    // Get settings for capacity
    const { data: settings } = await supabaseAdmin.from('settings').select('*').single()
    const capacity = settings?.overnight_capacity || 3

    // Count existing bookings for ID
    const { count } = await supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true })
    const id = generateId(count || 0)
    let code = generateCode()

    // Insert booking
    const bookingRow = () => ({
      id, student_name: studentName, student_email: studentEmail, guardian_phone: guardianPhone,
      guardian_email: guardianEmail, phone, school, municipality, grade,
      days, overnight: overnight || false,
      special_food: specialFood || null, other_info: otherInfo || null, code,
    })
    let { error: bookingError } = await supabaseAdmin.from('bookings').insert(bookingRow())
    // Reservlösning: om kolumnen `code` bara rymmer 4 tecken (22001 = värdet för långt), använd en kort kod.
    if (bookingError && (bookingError as any).code === '22001') {
      code = generateCode(2)
      ;({ error: bookingError } = await supabaseAdmin.from('bookings').insert(bookingRow()))
    }
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
        const room = await assignRoom(night, capacity, roomBookings)
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
      program_id: s.program_id || '',
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
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get('program')

  let query = supabaseAdmin
    .from('bookings')
    .select(`*, booking_slots(slot_id, slots(date, type, program_id, programs(name, icon))), room_bookings(room, date)`)
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

  if (!session) {
    // Obehörig (t.ex. en elev som bokar) ser bara vilka tider och rum som är upptagna, inga personuppgifter.
    return NextResponse.json((filtered || []).map((b: any) => ({
      id: b.id, days: b.days, overnight: b.overnight, created_at: b.created_at,
      student_name: '', student_email: '', guardian_email: '', guardian_phone: '', phone: '',
      school: '', municipality: '', grade: '', special_food: '', other_info: '', code: '',
      booking_slots: b.booking_slots, room_bookings: b.room_bookings,
    })))
  }
  return NextResponse.json(filtered)
}


