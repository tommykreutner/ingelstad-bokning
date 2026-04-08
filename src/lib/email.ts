import nodemailer from 'nodemailer'
import { supabaseAdmin } from './supabase'

export async function getSettings() {
  const { data } = await supabaseAdmin.from('settings').select('*').single()
  return data
}

async function createTransporter() {
  const settings = await getSettings()
  if (!settings?.smtp_host) {
    throw new Error('SMTP-inställningar saknas. Konfigurera dem under Admin → E-post.')
  }
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

export async function sendBookingConfirmation(booking: {
  id: string; student_name: string; student_email: string; guardian_email: string; guardian_phone?: string;  phone: string; school: string; municipality?: string; grade: string
  overnight: boolean; special_food?: string; other_info?: string; code: string
  slots: Array<{ date: string; type: string; program_name: string; program_icon: string; program_email_text: string }>
  room_bookings?: Array<{ room: number; date: string }>
}) {
  const settings = await getSettings()
  if (!settings) return

  const byDate: Record<string, typeof booking.slots> = {}
  booking.slots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })
  const scheduleLines = Object.entries(byDate).sort((a,b) => a[0].localeCompare(b[0]))
    .map(([date, slots]) => `${fmtDate(date)}: ${slots.map(s => `${s.program_icon} ${s.program_name} (${s.type==='fm'?'FM':s.type==='em'?'EM':'Heldag'})`).join(' + ')}`).join('\n')

  const overnightLine = booking.overnight ? `\n🛏️ ${overnightLabel(booking.slots.map(s=>s.date))}` : ''
  const roomLine = booking.room_bookings?.length ? '\n' + booking.room_bookings.map(rb=>`Rum ${rb.room}: natt ${fmtDate(rb.date)}`).join('\n') : ''
  const progTexts = [...new Set(booking.slots.map(s=>s.program_name))].map(name => {
    const s = booking.slots.find(x=>x.program_name===name)
    return s?.program_email_text ? `--- ${name} ---\n${s.program_email_text}` : ''
  }).filter(Boolean).join('\n\n')

  const studentInfo = [
    `Namn: ${booking.student_name}`,
    `Skola: ${booking.school}${booking.municipality ? ` (${booking.municipality})` : ''}`,
    `Årskurs: ${booking.grade}`, `Telefon: ${booking.phone}`, `E-post: ${booking.student_email}`,
    booking.special_food ? `Specialkost: ${booking.special_food}` : '',
    booking.other_info ? `Övrigt: ${booking.other_info}` : '',
  ].filter(Boolean).join('\n')

  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://boka.ingelstad.nu'}/avboka?kod=${booking.code}`
  const body = [
    '--- SCHEMA ---', scheduleLines + overnightLine + roomLine,
    '\n--- ELEVINFORMATION ---', studentInfo,
    '\n--- ALLMÄN INFO ---', settings.admin_email_text || '',
    booking.overnight && settings.internat_email_text ? `\n--- INTERNAT ---\n${settings.internat_email_text}` : '',
    progTexts ? `\n${progTexts}` : '',
    '\n--- DIN BOKNINGSKOD ---', booking.code,
    `\nAvboka din bokning: ${cancelUrl}`,
  ].filter(s => s !== '').join('\n').trim()

  const bcc = [...(settings.admin_emails || []),
    ...(booking.overnight && settings.internat_email ? [settings.internat_email] : []),
    ...(booking.special_food && settings.kitchen_email ? [settings.kitchen_email] : []),
  ]

  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: [booking.student_email, booking.guardian_email].filter(Boolean).join(', '),
      bcc: bcc.join(', ') || undefined,
      subject: `Bokningsbekräftelse – Prova-på-dag (${booking.code})`,
      text: body,
    })
  } catch (err) {
    console.error('Kunde inte skicka bekräftelsemail:', err)
  }
}

export async function sendCancellationEmail(booking: {
  id: string; student_name: string; student_email: string; guardian_email: string; guardian_phone?: string; code: string
}) {
  const settings = await getSettings()
  if (!settings) return
  try {
    const t = await createTransporter()
    await t.sendMail({
      from: `${settings.school_name || 'Ingelstadgymnasiet'} <${settings.smtp_user}>`,
      to: [booking.student_email, booking.guardian_email].filter(Boolean).join(', '),
      subject: `Avbokning bekräftad (${booking.code})`,
      text: `Hej ${booking.student_name},\n\nDin bokning (${booking.code}) har avbokats.\n\nHör av dig till skolan om du har frågor.\n\nMed vänliga hälsningar\n${settings.school_name || 'Ingelstadgymnasiet'}`,
    })
  } catch (err) {
    console.error('Kunde inte skicka avbokningsmail:', err)
  }
}


