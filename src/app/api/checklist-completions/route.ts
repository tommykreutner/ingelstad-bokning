import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('booking_id')
  let query = supabaseAdmin
    .from('checklist_completions')
    .select('*')
    .order('completed_at')
  if (bookingId) query = query.eq('booking_id', bookingId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { booking_id, item_id, completed, completed_by } = await req.json()
  if (!booking_id || !item_id) return NextResponse.json({ error: 'Saknar data' }, { status: 400 })

  if (completed === false) {
    // Ta bort completion
    const { error } = await supabaseAdmin
      .from('checklist_completions')
      .delete()
      .eq('booking_id', booking_id)
      .eq('item_id', item_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, completed: false })
  }

  // Upsert completion
  const { data, error } = await supabaseAdmin
    .from('checklist_completions')
    .upsert({ booking_id, item_id, completed: true, completed_by: completed_by || null },
      { onConflict: 'booking_id,item_id' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
