import { supabaseAdmin } from './supabase'
import { buildBcc, buildHtmlEmail, createTransporter, getSettings } from './email'

const ROOM_LABEL: Record<string, string> = { dubbel: 'Dubbelrum', enkel: 'Enkelrum' }

function first(name: string): string { return String(name || '').trim().split(/\s+/)[0] || '' }

function details(reg: any, track: any): string {
  return [
    `<strong>Anmälningsnummer:</strong> ${reg.id}`,
    `<strong>Inriktning:</strong> ${track?.icon || ''} ${track?.name || ''}`,
    `<strong>Namn:</strong> ${reg.student_name}`,
    reg.guardian_name ? `<strong>Vårdnadshavare:</strong> ${reg.guardian_name}` : '',
    `<strong>Skola:</strong> ${reg.school}${reg.municipality ? ` (${reg.municipality})` : ''}`,
    reg.grade ? `<strong>Årskurs:</strong> ${reg.grade}` : '',
    reg.tshirt ? `<strong>Tröjstorlek:</strong> ${reg.tshirt}` : '',
    `<strong>Boende:</strong> ${ROOM_LABEL[reg.room_pref] || reg.room_pref}`,
    reg.room_pref === 'dubbel' && reg.roommate_wish ? `<strong>Önskad rumskompis:</strong> ${reg.roommate_wish}` : '',
    reg.special_food ? `<strong>Specialkost:</strong> ${reg.special_food}` : '',
    reg.own_animal ? `<strong>${track?.own_animal_text || 'Egen hund/häst'}</strong> ${reg.own_animal}` : '',
    reg.other_info ? `<strong>Övrigt:</strong> ${reg.other_info}` : '',
  ].filter(Boolean).join('\n')
}

function fill(text: string, reg: any, track: any, cfg: any): string {
  return String(text || '')
    .replace(/\{namn\}/gi, first(reg.student_name))
    .replace(/\{inriktning\}/gi, track?.name || '')
    .replace(/\{datum\}/gi, cfg?.dates_text || '')
    .replace(/\{camp\}/gi, cfg?.title || 'SummerCamp')
}

// Lägerinformationen skrivs i admin med enkel markering (## rubrik, ### underrubrik, - punkt, 09:00 tid). Här görs den till mail-HTML.
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export function renderInfoSections(text: string): Array<{ title?: string; content: string; raw: boolean }> {
  const out: Array<{ title?: string; content: string; raw: boolean }> = []
  let cur: { title?: string; html: string[] } | null = null
  const flush = () => { if (cur && cur.html.length) out.push({ title: cur.title, content: cur.html.join(''), raw: true }); cur = null }
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('## ')) { flush(); cur = { title: esc(line.slice(3)), html: [] }; continue }
    if (!cur) cur = { html: [] }
    if (!line) continue
    if (line.startsWith('### ')) cur.html.push(`<div style="font-weight:700;margin:12px 0 4px;">${esc(line.slice(4))}</div>`)
    else if (line.startsWith('- ')) cur.html.push(`<div style="margin:2px 0;">&bull; ${esc(line.slice(2))}</div>`)
    else { const m = /^(\d{1,2}[:.]\d{2})\s+(.*)$/.exec(line)
      if (m) cur.html.push(`<div style="margin:2px 0;"><strong style="display:inline-block;min-width:48px;">${esc(m[1])}</strong> ${esc(m[2])}</div>`)
      else cur.html.push(`<div style="margin:6px 0;">${esc(line)}</div>`) }
  }
  flush()
  return out
}

function toText(sections: Array<{ title?: string; content: string }>): string {
  const plain = (h: string) => h.replace(/<\/div>/g, '\n').replace(/<[^>]+>/g, '').replace(/&bull;/g, '-').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
  return sections.map(s => (s.title ? `--- ${plain(s.title).toUpperCase()} ---\n` : '') + plain(s.content)).join('\n\n')
}

async function deliver(t: any, settings: any, kind: string, reg: any, subject: string,
  sections: Array<{ title?: string; content: string; highlight?: boolean; raw?: boolean }>, cfg: any, bcc: string[]) {
  const toList = [reg.student_email, reg.guardian_email].filter(Boolean)
  let accepted: string[] = [], rejected: string[] = [], error: string | null = null
  try {
    const info = await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: toList.join(', '),
      bcc: bcc.join(', ') || undefined,
      subject,
      html: buildHtmlEmail(sections, cfg?.title || 'SummerCamp'),
      text: toText(sections),
    })
    const addr = (a: any) => (typeof a === 'string' ? a : a?.address)
    accepted = ((info.accepted || []) as any[]).map(addr).filter(Boolean)
    rejected = ((info.rejected || []) as any[]).map(addr).filter(Boolean)
    if (!accepted.length) error = 'Inga mottagare accepterades'
  } catch (err: any) {
    error = err?.message || String(err)
    console.error('SMTP FEL SummerCamp:', error)
  }
  const { error: logErr } = await supabaseAdmin.from('camp_mail_log').insert({
    registration_id: reg.id, kind, to_addresses: toList, bcc_addresses: bcc, accepted, rejected, error,
  })
  if (logErr) console.error('camp_mail_log misslyckades:', logErr.message)
  return { ok: !error, error }
}

async function bccFor(settings: any, reg: any, track: any): Promise<string[]> {
  // Alla deltagare bor på internatet, så internat får alltid kopia
  return buildBcc(settings, track?.program_id ? [track.program_id] : [], true, !!reg.special_food)
}

function cancelLink(baseUrl: string, reg: any): string {
  return `${baseUrl}/summercamp.html?avboka=${encodeURIComponent(reg.code)}`
}

// Automatiskt mail direkt efter anmälan: "din plats är bokad" (slutgiltig bekräftelse kommer separat).
export async function sendCampBooked(reg: any, track: any, cfg: any, baseUrl: string) {
  const settings = await getSettings()
  if (!settings) return { ok: false, error: 'Inställningar saknas' }
  const sections: Array<{ title?: string; content: string; highlight?: boolean; raw?: boolean }> = [
    { title: 'Din plats är bokad', highlight: true,
      content: `Hej ${first(reg.student_name)}!\n\nTack för din anmälan till ${cfg?.title || 'SummerCamp'}. Din plats på <strong>${track?.icon || ''} ${track?.name || ''}</strong> är bokad.\n\nDu får en slutgiltig bekräftelse med mer information senare.` },
  ]
  if (cfg?.dates_text) sections.push({ title: 'När', content: cfg.dates_text })
  sections.push({ title: 'Dina uppgifter', content: details(reg, track) })
  if (cfg?.billing_text) sections.push({ title: 'Avgift och betalning', content: cfg.billing_text })
  if (cfg?.booked_text) sections.push({ title: 'Information', content: fill(cfg.booked_text, reg, track, cfg) })
  sections.push({ title: 'Avboka', content: `Kan du inte komma? Avboka här så att någon annan får platsen:\n${cancelLink(baseUrl, reg)}\n\nDin avbokningskod: <strong>${reg.code}</strong>` })
  try {
    const t = await createTransporter()
    return await deliver(t, settings, 'bokad', reg, `Din plats är bokad – ${cfg?.title || 'SummerCamp'} (${reg.id})`, sections, cfg, await bccFor(settings, reg, track))
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
}

// Manuellt mail: slutgiltig bekräftelse. Skickas av personal från admin, en eller flera åt gången.
export async function sendCampFinalBatch(items: Array<{ reg: any; track: any }>, text: string, cfg: any, includeInfo = false) {
  const settings = await getSettings()
  const results: Array<{ id: string; ok: boolean; error?: string | null }> = []
  if (!settings) return items.map(i => ({ id: i.reg.id, ok: false, error: 'Inställningar saknas' }))
  let t: any
  try { t = await createTransporter() } catch (err: any) {
    return items.map(i => ({ id: i.reg.id, ok: false, error: err?.message || String(err) }))
  }
  for (const { reg, track } of items) {
    const sections: Array<{ title?: string; content: string; highlight?: boolean; raw?: boolean }> = [
      { title: 'Slutgiltig bekräftelse', highlight: true, content: fill(text, reg, track, cfg) },
      { title: 'Dina uppgifter', content: details(reg, track) },
    ]
    if (track?.gear_text) sections.push({ title: `Utrustning ${track.name}`, content: track.gear_text })
    if (includeInfo && cfg?.info_text) for (const s of renderInfoSections(cfg.info_text)) sections.push(s as any)
    const r = await deliver(t, settings, 'slutgiltig', reg, `Slutgiltig bekräftelse – ${cfg?.title || 'SummerCamp'} (${reg.id})`, sections, cfg, [])
    results.push({ id: reg.id, ok: r.ok, error: r.error })
  }
  return results
}

export async function sendCampCancelled(reg: any, track: any, cfg: any) {
  const settings = await getSettings()
  if (!settings) return { ok: false, error: 'Inställningar saknas' }
  const sections = [
    { title: 'Avbokning bekräftad', content: `Hej!\n\nAnmälan för <strong>${reg.student_name}</strong> (${reg.id}) till ${cfg?.title || 'SummerCamp'}, ${track?.icon || ''} ${track?.name || ''}, har avbokats.\n\nHör av dig till skolan om du har frågor.` },
  ]
  try {
    const t = await createTransporter()
    return await deliver(t, settings, 'avbokad', reg, `Avbokning bekräftad – ${cfg?.title || 'SummerCamp'} (${reg.id})`, sections, cfg, await bccFor(settings, reg, track))
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
}
