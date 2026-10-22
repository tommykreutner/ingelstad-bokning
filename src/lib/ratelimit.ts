// Enkel begränsning av antal försök i serverns minne (per serverinstans).
// Räcker som skydd mot gissning av lösenord/bokningskoder; ersätter inte en databas-baserad spärr.
const buckets = new Map<string, number[]>()

function prune(key: string, windowMs: number): number[] {
  const now = Date.now()
  const arr = (buckets.get(key) || []).filter(t => now - t < windowMs)
  if (arr.length) buckets.set(key, arr)
  else buckets.delete(key)
  return arr
}

// Sant om det redan gjorts max antal misslyckade försök inom tidsfönstret.
export function tooMany(key: string, max: number, windowMs: number): boolean {
  return prune(key, windowMs).length >= max
}

// Registrera ett misslyckat försök.
export function noteFailure(key: string, windowMs: number): void {
  const arr = prune(key, windowMs)
  arr.push(Date.now())
  buckets.set(key, arr)
  if (buckets.size > 5000) {
    const first = buckets.keys().next().value
    if (first !== undefined) buckets.delete(first)
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0].trim()
  return first || req.headers.get('x-real-ip') || 'okand'
}
