import { Checklist } from '@/components/Checklist'
import { Setup } from '@/components/Setup'

export default function App() {
  return window.location.hash === '#setup' ? <Setup /> : <Checklist />
}
