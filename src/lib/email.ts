import nodemailer from 'nodemailer'
import { supabaseAdmin } from './supabase'

export async function getSettings() {
  const { data } = await supabaseAdmin.from('settings').select('*').single()
  return data
}

async function createTransporter() {
  const settings = await getSettings()
  if (!settings?.smtp_host) throw new Error('SMTP-inställningar saknas.')
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587'),
    secure: settings.smtp_port === '465',
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    tls: { rejectUnauthorized: false },
  })
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
}

function overnightLabel(slotDates: string[]): string {
  const sorted = [...new Set(slotDates)].sort()
  if (!sorted.length) return ''
  const day1 = sorted[0], day2 = sorted.length > 1 ? sorted[sorted.length - 1] : null
  const arrival = prevDay(day1)
  return day2 && day2 !== day1
    ? `Ankomst ${fmtDate(arrival)} kväll, avresa ${fmtDate(day2)} kl 15:50 (2 nätter)`
    : `Ankomst ${fmtDate(arrival)} kväll, avresa ${fmtDate(day1)} kl 15:50`
}

function makeLink(text: string): string {
  return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#2d5a3d;">$1</a>')
}

function nl2br(text: string): string {
  return makeLink(text).replace(/\n/g, '<br>')
}

function buildHtmlEmail(sections: Array<{title?: string, content: string, highlight?: boolean}>): string {
  const sectionsHtml = sections.map(s => `
    <div style="margin-bottom:20px;">
      ${s.title ? `<div style="font-weight:700;color:#2d5a3d;font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #c8ddd0;">${s.title}</div>` : ''}
      <div style="color:#1a2e1e;line-height:1.7;${s.highlight?'background:#e8f4ed;padding:12px;border-radius:8px;border-left:4px solid #2d5a3d;':''}">${nl2br(s.content)}</div>
    </div>
  `).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f7faf8;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#2d5a3d;padding:24px 28px;border-radius:12px 12px 0 0;">
        <div style="color:#fff;font-size:20px;font-weight:700;">🌲 Ingelstadgymnasiet</div>
        <div style="color:#a8d4b8;font-size:13px;margin-top:4px;">Prova-på-dagar</div>
      </div>
      <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 2px 12px rgba(45,90,61,.08);">
        ${sectionsHtml}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #c8ddd0;font-size:11px;color:#7a9485;text-align:center;">
          Ingelstadgymnasiet &bull; info@ingelstad.nu
        </div>
      </div>
    </div>
  </body></html>`
}

export async function sendBookingConfirmation(booking: {
  id: string; student_name: string; student_email: string; guardian_email: string; guardian_phone?: string; phone: string; school: string; municipality?: string; grade: string
  overnight: boolean; special_food?: string; other_info?: string; code: string
  slots: Array<{ date: string; type: string; program_name: string; program_icon: string; program_email_text: string; program_id?: string }>
  room_bookings?: Array<{ room: number; date: string }>
}) {
  const settings = await getSettings()
  if (!settings) return

  const byDate: Record<string, typeof booking.slots> = {}
  booking.slots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })

  const scheduleContent = Object.entries(byDate).sort((a,b) => a[0].localeCompare(b[0]))
    .map(([date, slots]) => `<strong>${fmtDate(date)}:</strong> ${slots.map(s => `${s.program_icon} ${s.program_name} (${s.type==='fm'?'FM':s.type==='em'?'EM':'Heldag'})`).join(' + ')}`)
    .join('\n')
    + (booking.overnight ? `\n🛏️ ${overnightLabel(booking.slots.map(s=>s.date))}` : '')
    + (booking.room_bookings?.length ? '\n' + booking.room_bookings.map(rb=>`Rum ${rb.room}: natt ${fmtDate(rb.date)}`).join('\n') : '')

  const studentContent = [
    `<strong>Namn:</strong> ${booking.student_name}`,
    `<strong>Skola:</strong> ${booking.school}${booking.municipality ? ` (${booking.municipality})` : ''}`,
    `<strong>Årskurs:</strong> ${booking.grade}`,
    `<strong>Elevtelefon:</strong> ${booking.phone}`,
    `<strong>Elev e-post:</strong> ${booking.student_email}`,
    booking.guardian_email ? `<strong>Vårdnadshavare e-post:</strong> ${booking.guardian_email}` : '',
    booking.guardian_phone ? `<strong>Vårdnadshavare telefon:</strong> ${booking.guardian_phone}` : '',
    booking.special_food ? `<strong>Specialkost:</strong> ${booking.special_food}` : '',
    booking.other_info ? `<strong>Övrigt:</strong> ${booking.other_info}` : '',
  ].filter(Boolean).join('\n')

  const sections: Array<{title?: string, content: string, highlight?: boolean}> = [
    { title: 'Schema', content: scheduleContent, highlight: true },
    { title: 'Elevinformation', content: studentContent },
  ]

  if (settings.admin_email_text) sections.push({ title: 'Information', content: settings.admin_email_text })
  if (booking.overnight && settings.internat_email_text) sections.push({ title: 'Internat', content: settings.internat_email_text })

  const progTexts = [...new Set(booking.slots.map(s=>s.program_name))].map(name => {
    const s = booking.slots.find(x=>x.program_name===name)
    return s?.program_email_text ? { title: name, content: s.program_email_text } : null
  }).filter(Boolean) as Array<{title: string, content: string}>
  sections.push(...progTexts)

  if (booking.special_food && (settings as any).kitchen_email_text) {
    sections.push({ title: 'Specialkost — information', content: (settings as any).kitchen_email_text })
  }

  const html = buildHtmlEmail(sections)

  // Plain text fallback
  const text = sections.map(s => (s.title ? `--- ${s.title.toUpperCase()} ---\n` : '') + s.content.replace(/<[^>]+>/g,'')).join('\n\n')

  // Get staff emails
  const programIds = [...new Set(booking.slots.map((s: any) => s.program_id).filter(Boolean))]
  const { data: staffData } = await supabaseAdmin.from('staff').select('email').eq('role', 'personal').in('program_id', programIds.length ? programIds : ['__none__'])
  const staffEmails = (staffData || []).filter((s: any) => s.email).map((s: any) => s.email)
  const internatEmails = booking.overnight ? await supabaseAdmin.from('staff').select('email').eq('role', 'internat').then(({data}) => (data||[]).filter((s:any)=>s.email).map((s:any)=>s.email)) : []

  const bcc = [...(settings.admin_emails || []), ...staffEmails,
    ...(booking.overnight && settings.internat_email ? [settings.internat_email] : []),
    ...internatEmails,
    ...(booking.special_food && settings.kitchen_email ? [settings.kitchen_email] : []),
  ].filter(Boolean)

  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: [booking.student_email, booking.guardian_email].filter(Boolean).join(', '),
      bcc: bcc.join(', ') || undefined,
      subject: `Bokningsbekräftelse – Prova-på-dag (${booking.id})`,
      html, text,
    })
  } catch (err: any) {
    console.error('SMTP FEL:', err?.message, err?.code)
  }
}

export async function sendCancellationEmail(booking: {
  id: string; student_name: string; student_email: string; guardian_email: string; guardian_phone?: string; code: string
}) {
  const settings = await getSettings()
  if (!settings) return
  const html = buildHtmlEmail([{
    title: 'Avbokning bekräftad',
    content: `Hej ${booking.student_name},\n\nDin bokning (<strong>${booking.code}</strong>) har avbokats.\n\nHör av dig till skolan om du har frågor.`
  }])
  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: [booking.student_email, booking.guardian_email].filter(Boolean).join(', '),
      subject: `Avbokning bekräftad (${booking.code})`,
      html, text: `Hej ${booking.student_name},\n\nDin bokning (${booking.code}) har avbokats.\n\nHör av dig till skolan om du har frågor.`,
    })
  } catch (err) { console.error('Kunde inte skicka avbokningsmail:', err) }
}

export async function sendAdminNotification({ to, subject, body }: { to: string[], subject: string, body: string }) {
  const settings = await getSettings()
  if (!settings) return
  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: to.join(', '),
      subject,
      text: body,
    })
  } catch (err) { console.error('Kunde inte skicka adminnotifiering:', err) }
}

export async function sendFollowUpEmail(booking: {
  id: string; student_name: string; student_email: string; guardian_email: string; code: string
}) {
  const settings = await getSettings()
  if (!settings) return
  const evalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://boka.ingelstad.nu'}/utvardera.html?kod=${booking.id}`
  const html = buildHtmlEmail([
    {
      title: 'Tack för ditt besök!',
      content: `Hej ${booking.student_name}!\n\nTack för att du besökte oss på Ingelstadgymnasiet. Vi hoppas att du fick en bra bild av vad vi erbjuder.\n\nVi skulle uppskatta om du tog några minuter att fylla i vår korta utvärdering — din feedback hjälper oss att bli bättre!`,
      highlight: true
    },
    {
      title: 'Lämna din utvärdering',
      content: `<a href="${evalUrl}" style="display:inline-block;background:#2d5a3d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">👉 Klicka här för att utvärdera ditt besök</a>\n\nLänken är giltig i 14 dagar.`
    }
  ])
  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: [booking.student_email, booking.guardian_email].filter(Boolean).join(', '),
      subject: `Hur var ditt besök på Ingelstadgymnasiet?`,
      html,
      text: `Hej ${booking.student_name}!\n\nTack för ditt besök! Lämna gärna din utvärdering här: ${evalUrl}\n\nLänken är giltig i 14 dagar.`,
    })
  } catch (err: any) {
    console.error('SMTP FEL uppföljning:', err?.message)
  }
}
