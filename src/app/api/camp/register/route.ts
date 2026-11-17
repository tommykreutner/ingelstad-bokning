import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { cleanEmail, cleanText } from '@/lib/sanitize'
import { clientIp, noteFailure, tooMany } from '@/lib/ratelimit'
import { baseUrl, campStatus, getCampConfig, splitList } from '@/lib/campdata'
import { sendCampBooked } from '@/lib/campmail'

export const dynamic = 'force-dynamic'
const HOUR = 60 * 60 * 1000
const newCode = () => crypto.randomBytes(4).toString('hex').toUpperCase()

export async function POST(req: NextRequest) {
  try {
    // Max 40 anmälningsförsök per timme och IP (flera elever kan sitta på samma skolnät)
    const ipKey = 'campreg:' + clientIp(req)
    if (tooMany(ipKey, 40, HOUR)) return NextResponse.json({ error: 'För många försök. Vänta en stund och försök igen.' }, { status: 429 })
    noteFailure(ipKey, HOUR)

    const b = await req.json()
    const cfg = await getCampConfig()
    if (!cfg) return NextResponse.json({ error: 'SummerCamp är inte uppsatt än' }, { status: 503 })
    if (campStatus(cfg) !== 'open') return NextResponse.json({ error: 'Anmälan är inte öppen just nu.', code: 'CLOSED' }, { status: 403 })
    if (b.consent !== true) return NextResponse.json({ error: 'Du måste godkänna hanteringen av personuppgifter.' }, { status: 400 })

    const studentName = cleanText(b.studentName, 100)
    const studentEmail = cleanEmail(b.studentEmail)
    const guardianName = cleanText(b.guardianName, 100)
    const guardianEmail = cleanEmail(b.guardianEmail)
    const guardianPhone = cleanText(b.guardianPhone, 40)
    const phone = cleanText(b.phone, 40)
    const school = cleanText(b.school, 120)
    const municipality = cleanText(b.municipality, 80)
    const grade = cleanText(b.grade, 40)
    const tshirt = cleanText(b.tshirt, 20)
    const roomPref = String(b.roomPref || '')
    const trackId = cleanText(b.trackId, 60)

    if (!studentName || !studentEmail || !guardianEmail) return NextResponse.json({ error: 'Namn och giltiga e-postadresser till elev och vårdnadshavare krävs.' }, { status: 400 })
    if (!phone || !guardianName || !guardianPhone || !school || !municipality) return NextResponse.json({ error: 'Fyll i alla obligatoriska fält.' }, { status: 400 })
    if (!trackId) return NextResponse.json({ error: 'Välj en inriktning.' }, { status: 400 })
    const grades = splitList(cfg.grade_options)
    if (grades.length && !grades.includes(grade)) return NextResponse.json({ error: 'Välj årskurs.' }, { status: 400 })
    const shirts = splitList(cfg.shirt_sizes)
    if (shirts.length && !shirts.includes(tshirt)) return NextResponse.json({ error: 'Välj tröjstorlek.' }, { status: 400 })
    if (!['dubbel', 'enkel'].includes(roomPref)) return NextResponse.json({ error: 'Välj boende.' }, { status: 400 })

    // Frågan om egen hund/häst finns bara på de inriktningar där den är inlagd (Hund, Häst) och måste då besvaras
    const { data: trk } = await supabaseAdmin.from('camp_tracks').select('own_animal_text').eq('id', trackId).maybeSingle()
    let ownAnimal = ''
    if ((trk as any)?.own_animal_text) {
      const a = String(b.ownAnimal || '').toLowerCase()
      if (a !== 'ja' && a !== 'nej') return NextResponse.json({ error: 'Svara ja eller nej på frågan om att ta med eget djur.' }, { status: 400 })
      ownAnimal = a === 'ja' ? 'Ja' : 'Nej'
    }

    const payload: any = {
      track_id: trackId, student_name: studentName, student_email: studentEmail, guardian_name: guardianName, guardian_email: guardianEmail,
      guardian_phone: guardianPhone, phone, school, municipality, grade, tshirt, room_pref: roomPref,
      roommate_wish: roomPref === 'dubbel' ? cleanText(b.roommateWish, 150) : '',
      special_food: cleanText(b.specialFood, 100), other_info: cleanText(b.otherInfo, 1000),
      own_animal: ownAnimal,
    }

    // Själva platstilldelningen sker i databasen (camp_register) så att antalet bokade aldrig kan överstiga antalet platser.
    let result: any = null
    for (let i = 0; i < 3; i++) {
      payload.code = newCode()
      const { data, error } = await supabaseAdmin.rpc('camp_register', { p: payload })
      if (error) { console.error('camp_register fel:', error.message); return NextResponse.json({ error: 'Något gick fel. Försök igen.' }, { status: 500 }) }
      result = data
      if (result?.error !== 'RETRY') break
    }
    if (result?.error === 'FULL') return NextResponse.json({ error: 'Tyvärr, den inriktningen blev precis full.', code: 'FULL' }, { status: 409 })
    if (result?.error === 'CLOSED') return NextResponse.json({ error: 'Anmälan är inte öppen just nu.', code: 'CLOSED' }, { status: 403 })
    if (result?.error === 'DUPLICATE') return NextResponse.json({ error: 'Det finns redan en anmälan med den e-postadressen. Kontakta skolan om något behöver ändras.', code: 'DUPLICATE' }, { status: 409 })
    if (result?.error === 'BAD') return NextResponse.json({ error: 'Något i formuläret var fel. Kontrollera och försök igen.' }, { status: 400 })
    if (result?.error === 'NO_TRACK') return NextResponse.json({ error: 'Inriktningen finns inte.' }, { status: 400 })
    if (!result?.id) return NextResponse.json({ error: 'Något gick fel. Försök igen.' }, { status: 500 })

    // Mailet får inte stoppa anmälan: platsen är redan bokad. Misslyckas mailet syns det i camp_mail_log och i admin.
    try {
      const { data: reg } = await supabaseAdmin.from('camp_registrations').select('*').eq('id', result.id).single()
      const { data: track } = await supabaseAdmin.from('camp_tracks').select('*').eq('id', trackId).single()
      if (reg) await sendCampBooked(reg, track, cfg, baseUrl(req))
    } catch (e: any) { console.error('Bokningsmail SummerCamp:', e?.message) }

    return NextResponse.json({ id: result.id, code: result.code })
  } catch (err: any) {
    console.error('Camp register error:', err)
    return NextResponse.json({ error: 'Något gick fel. Försök igen.' }, { status: 500 })
  }
}
