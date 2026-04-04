// Bokningssidan levererar prototypen som en iframe i v1.0
// I v2 ersätts detta med fullständiga React-komponenter
export default function BookingPage() {
  return (
    <iframe
      src="/prototype.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Prova-på-bokning"
    />
  )
}
