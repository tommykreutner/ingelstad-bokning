import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { clientIp, noteFailure, tooMany } from '@/lib/ratelimit'
import { getCampConfig } from '@/lib/campdata'
import { sendCampCancelled } from '@/lib/campmail'

export const dynamic = 'force-dynamic'
const WINDOW = 15 * 60 * 1000

async function find(code: string) {
  const { data } = await supabaseAdmin.from('camp_registrations').select('*').eq('code', code.toUpperCase().trim()).neq('status', 'avbokad').maybeSingle()
  return data as any
}

// Visar bara förnamn och inriktning, så att koden inte kan användas för att läsa ut personuppgifter.
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code') || ''
  const ipKey = 'campcancel:' + clientIp(req)
  if (tooMany(ipKey, 15, WINDOW)) return NextResponse.json({ error: 'För många försök. Vänta en stund.' }, { status: 429 })
  const reg = code ? await find(code) : null
  if (!reg) { noteFailure(ipKey, WINDOW); return NextResponse.json({ error: 'Anmälan hittades inte eller är redan avbokad.' }, { status: 404 }) }
  const { data: track } = await supabaseAdmin.from('camp_tracks').select('name, icon').eq('id', reg.track_id).single()
  return NextResponse.json({ first_name: String(reg.student_name).split(/\s+/)[0], track: track ? `${(track as any).icon} ${(track as any).name}` : '' })
}

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Kod saknas' }, { status: 400 })
  const ipKey = 'campcancel:' + clientIp(req)
  if (tooMany(ipKey, 15, WINDOW)) return NextResponse.json({ error: 'För många försök. Vänta en stund.' }, { status: 429 })
  const reg = await find(code)
  if (!reg) { noteFailure(ipKey, WINDOW); return NextResponse.json({ error: 'Anmälan hittades inte eller är redan avbokad.' }, { status: 404 }) }
  // Villkoret på status gör att två samtidiga avbokningar inte kan ge två mail
  const { data: upd, error } = await supabaseAdmin.from('camp_registrations')
    .update({ status: 'avbokad', cancelled_at: new Date().toISOString() }).eq('id', reg.id).neq('status', 'avbokad').select()
  if (error) return NextResponse.json({ error: 'Något gick fel.' }, { status: 500 })
  if (upd && upd.length) {
    const { data: track } = await supabaseAdmin.from('camp_tracks').select('*').eq('id', reg.track_id).single()
    try { await sendCampCancelled(reg, track, await getCampConfig()) } catch (e: any) { console.error('Avbokningsmail SummerCamp:', e?.message) }
  }
  return NextResponse.json({ ok: true })
}
