import { supabaseAdmin } from './supabase'

export async function getCampConfig(): Promise<any> {
  const { data } = await supabaseAdmin.from('camp_config').select('*').eq('id', 1).single()
  return data
}

// Anmälan är öppen när reglaget är på och klockan ligger inom ev. öppnings-/stängningstid.
export function campStatus(cfg: any): 'open' | 'closed' | 'not_yet' | 'ended' {
  if (!cfg || !cfg.open) return 'closed'
  const now = Date.now()
  if (cfg.opens_at && now < new Date(cfg.opens_at).getTime()) return 'not_yet'
  if (cfg.closes_at && now > new Date(cfg.closes_at).getTime()) return 'ended'
  return 'open'
}

export function splitList(v: any): string[] {
  return String(v ?? '').split(',').map(s => s.trim()).filter(Boolean)
}

// Antal aktiva (ej avbokade) anmälningar per inriktning.
export async function countsByTrack(): Promise<{ taken: Record<string, number>; confirmed: Record<string, number> }> {
  const { data } = await supabaseAdmin.from('camp_registrations').select('track_id, status').neq('status', 'avbokad')
  const taken: Record<string, number> = {}
  const confirmed: Record<string, number> = {}
  for (const r of (data || []) as any[]) {
    taken[r.track_id] = (taken[r.track_id] || 0) + 1
    if (r.status === 'bekraftad') confirmed[r.track_id] = (confirmed[r.track_id] || 0) + 1
  }
  return { taken, confirmed }
}

export function baseUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, '')
}
