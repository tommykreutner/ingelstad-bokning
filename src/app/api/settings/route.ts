import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('settings').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }
  const updates = await req.json()
  const { data, error } = await supabaseAdmin
    .from('settings').update(updates).eq('id', updates.id || (await supabaseAdmin.from('settings').select('id').single()).data?.id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
