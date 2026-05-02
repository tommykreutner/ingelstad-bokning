import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('programs').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behorig' }, { status: 403 })
  }
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('programs').insert({
    id: body.id, name: body.name, icon: body.icon || '??',
    is_nv: body.isNV || false, hidden: body.hidden || false,
    slot_mode: body.slotMode || 'closed',
    default_capacity: body.defaultCapacity || 10,
    email_text: body.emailText || '',
    nv_compatible: body.nvCompatible || [],
    description: body.description || '',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behorig' }, { status: 403 })
  }
  const { id, ...updates } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('programs').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

