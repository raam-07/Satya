import { permanentRedirect } from 'next/navigation'

export const revalidate = false

export default function PromisesPage() {
  permanentRedirect('/vaade')
}
