// Rensar text som elever fyller i, så att den aldrig kan innehålla HTML-taggar eller
// tecken som bryter ut ur attribut. Namnen visas i personalens vyer och i mail.
export function cleanText(v: any, max: number): string {
  return String(v ?? '')
    .replace(/[<>]/g, '')
    .replace(/"/g, '”')
    .replace(/['`]/g, '’')
    .trim()
    .slice(0, max)
}

// Samma regel men tillåter tomt värde; returnerar null om adressen ser ogiltig ut.
export function cleanEmail(v: any): string | null {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (s.length > 200) return null
  return /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(s) ? s : null
}
