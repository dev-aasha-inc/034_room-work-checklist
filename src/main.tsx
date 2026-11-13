import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { adoptTokenFromUrl } from './lib/useRecords.ts'

adoptTokenFromUrl()

// Adding #setup, or opening a field link in a tab that already shows the app, only changes the hash.
// Reload so the token is picked up and the right page is shown.
window.addEventListener('hashchange', () => window.location.reload())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
