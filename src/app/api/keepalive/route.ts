import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  await supabaseAdmin.from('settings').select('id').single()
  return NextResponse.json({ ok: true, time: new Date().toISOString() })
}
