import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  let query = supabaseAdmin.from('user_programs').select('*')
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  const { user_id, program_ids } = await req.json()
  if (!user_id || !Array.isArray(program_ids)) {
    return NextResponse.json({ error: 'Saknar data' }, { status: 400 })
  }

  // Ta bort befintliga och sätt de nya (enklast och säkrast)
  await supabaseAdmin.from('user_programs').delete().eq('user_id', user_id)

  if (program_ids.length > 0) {
    const rows = program_ids.map((pid: string) => ({ user_id, program_id: pid }))
    const { error } = await supabaseAdmin.from('user_programs').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
