import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('checklist_items')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { label, icon, sort_order } = await req.json()
  if (!label) return NextResponse.json({ error: 'Saknar label' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('checklist_items')
    .insert({ label, icon: icon || '✅', sort_order: sort_order || 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Saknar id' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('checklist_items')
    .update({ active: false })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
