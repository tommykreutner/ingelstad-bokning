import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const termStart = searchParams.get('term_start')
  const termEnd = searchParams.get('term_end')
  const scope = searchParams.get('scope')       // global | program | internat | all
  const programId = searchParams.get('program_id')

  // utvardera.html: kolla bokningskod + returnera bokning + ev redan svarat
  if (code) {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`id, student_name, overnight, booking_slots(slots(program_id, programs(name,icon)))`)
      .eq('id', code)
      .single()
    if (error || !booking) return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })

    const { data: existing } = await supabaseAdmin
      .from('eval_answers')
      .select('id')
      .eq('booking_id', booking.id)
      .limit(1)

    if (existing && existing.length > 0) return NextResponse.json({ already_submitted: true })
    return NextResponse.json({ booking })
  }

  // Statistik: hämta svar med fråga + bokning
  let query = supabaseAdmin
    .from('eval_answers')
    .select(`
      id, answer, created_at, booking_id,
      bookings ( student_name, school, grade ),
      eval_questions ( id, scope, program_id, question, type )
    `)
    .order('created_at', { ascending: false })

  if (termStart) query = query.gte('created_at', termStart)
  if (termEnd)   query = query.lte('created_at', termEnd + 'T23:59:59')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtrera bort null-joins och ev scope/program
  let filtered = (data || []).filter((r: any) => r.eval_questions !== null)
  if (scope && scope !== 'all') filtered = filtered.filter((r: any) => r.eval_questions.scope === scope)
  if (programId) filtered = filtered.filter((r: any) => r.eval_questions.program_id === programId)

  return NextResponse.json(filtered)
}
