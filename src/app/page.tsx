// Huvudsida: servar prototypen som utgångspunkt
// I v2 ersätts detta med React-komponenter per vy
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/boka')
}
