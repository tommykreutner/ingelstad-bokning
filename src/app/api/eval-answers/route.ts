import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const termStart = searchParams.get('term_start')
  const termEnd = searchParams.get('term_end')
  const programId = searchParams.get('program_id')
  const scope = searchParams.get('scope')

  // Hämta svar med fråga + bokning
  let query = supabaseAdmin
    .from('eval_answers')
    .select(`
      id,
      answer,
      created_at,
      booking_id,
      bookings ( student_name, school, grade, program_id ),
      eval_questions ( id, scope, program_id, question, type )
    `)
    .order('created_at', { ascending: false })

  if (termStart) query = query.gte('created_at', termStart)
  if (termEnd) query = query.lte('created_at', termEnd + 'T23:59:59')

  // Filtrera på program eller scope
  if (programId) {
    query = query.eq('eval_questions.program_id', programId)
  } else if (scope) {
    query = query.eq('eval_questions.scope', scope)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtrera bort rader där frågan inte matchade joinen
  const filtered = (data || []).filter((r: any) => r.eval_questions !== null)
  return NextResponse.json(filtered)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { booking_id, answers } = body
  // answers: [{ question_id, answer }]

  if (!booking_id || !Array.isArray(answers) || !answers.length) {
    return NextResponse.json({ error: 'Saknar data' }, { status: 400 })
  }

  // Kolla att bokningen finns och inte redan har svarat
  const { data: existing } = await supabaseAdmin
    .from('eval_answers')
    .select('id')
    .eq('booking_id', booking_id)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Utvärdering redan inlämnad' }, { status: 409 })
  }

  const rows = answers.map((a: any) => ({
    booking_id,
    question_id: a.question_id,
    answer: a.answer ?? null,
  }))

  const { error } = await supabaseAdmin
    .from('eval_answers')
    .insert(rows)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Markera bokningen som utvärderad
  await supabaseAdmin
    .from('bookings')
    .update({ eval_submitted: true })
    .eq('id', booking_id)

  return NextResponse.json({ ok: true })
}
