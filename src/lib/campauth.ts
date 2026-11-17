import { supabaseAdmin } from './supabase'

// Vem får göra vad i SummerCamp-delen av admin.
//  admin    – allt (inställningar, platser, alla anmälningar, skicka bekräftelser)
//  personal – anmälningar för inriktningar som är kopplade till lärarens program (läsa, bekräfta, avboka)
//  internat – läsa alla anmälningar (rum, tröjor, kost), inget annat
export type CampAccess = { role: string; all: boolean; write: boolean; admin: boolean; programIds: string[] }

export async function campAccess(session: any): Promise<CampAccess | null> {
  if (!session) return null
  if (session.role === 'admin') return { role: 'admin', all: true, write: true, admin: true, programIds: [] }
  if (session.role === 'internat') return { role: 'internat', all: true, write: false, admin: false, programIds: [] }
  if (session.role === 'personal') {
    const { data } = await supabaseAdmin.from('user_programs').select('program_id').eq('user_id', session.id)
    const ids = [...new Set([session.program_id, ...(data || []).map((r: any) => r.program_id)].filter(Boolean))] as string[]
    return { role: 'personal', all: false, write: true, admin: false, programIds: ids }
  }
  return null
}

// Vilka inriktningar (track-id) personen får se anmälningar för.
export function allowedTrackIds(access: CampAccess, tracks: any[]): string[] {
  if (access.all) return tracks.map(t => t.id)
  return tracks.filter(t => t.program_id && access.programIds.includes(t.program_id)).map(t => t.id)
}
