import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { campStatus, countsByTrack, getCampConfig, splitList } from '@/lib/campdata'

export const dynamic = 'force-dynamic'

// Publik information till anmälningssidan. Innehåller aldrig personuppgifter, bara platser kvar.
export async function GET() {
  const cfg = await getCampConfig()
  if (!cfg) return NextResponse.json({ error: 'SummerCamp är inte uppsatt än' }, { status: 503 })
  const { data: tracks } = await supabaseAdmin.from('camp_tracks').select('*').eq('active', true).order('sort').order('name')
  const { taken } = await countsByTrack()
  const { data: settings } = await supabaseAdmin.from('settings').select('food_options').single()
  const status = campStatus(cfg)
  return NextResponse.json({
    title: cfg.title,
    dates_text: cfg.dates_text,
    intro_text: cfg.intro_text,
    billing_text: cfg.billing_text || '',
    info_text: cfg.info_text || '',
    status,
    accepting: status === 'open',
    opens_at: cfg.opens_at,
    closes_at: cfg.closes_at,
    grade_options: splitList(cfg.grade_options),
    shirt_sizes: splitList(cfg.shirt_sizes),
    food_options: (settings as any)?.food_options || [],
    tracks: ((tracks || []) as any[]).map(t => {
      const left = Math.max(0, t.capacity - (taken[t.id] || 0))
      return { id: t.id, name: t.name, icon: t.icon, description: t.description, gear_text: t.gear_text || '', own_animal_text: t.own_animal_text || '', left, full: left === 0 }
    }),
  })
}
