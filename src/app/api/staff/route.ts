import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, hashPassword } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin
    .from('staff').select('id, username, name, email, role, program_id').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const { username, name, email, role, programId, password } = await req.json()
  const { data, error } = await supabaseAdmin.from('staff').insert({
    username, name, email, role,
    program_id: programId || null,
    password_hash: hashPassword(password),
  }).select('id, username, name, email, role, program_id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const { id, email, role, programId, password } = await req.json()
  const updates: any = { email, role, program_id: programId || null }
  if (password) updates.password_hash = hashPassword(password)
  const { data, error } = await supabaseAdmin
    .from('staff').update(updates).eq('id', id).select('id, username, name, email, role, program_id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID saknas' }, { status: 400 })
  const { error } = await supabaseAdmin.from('staff').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
