import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')
  const programId = searchParams.get('program_id')

  let query = supabaseAdmin
    .from('eval_questions')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  if (scope) query = query.eq('scope', scope)
  if (programId) query = query.eq('program_id', programId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { scope, program_id, question, type, sort_order } = body
  if (!scope || !question || !type) return NextResponse.json({ error: 'Saknar fält' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('eval_questions')
    .insert({ scope, program_id: program_id || null, question, type, sort_order: sort_order || 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Saknar id' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('eval_questions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Saknar id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('eval_questions')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
