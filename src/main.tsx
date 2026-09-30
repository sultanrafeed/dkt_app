import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

// Offline support: the service worker precaches the app, questions and pictures.
// Native (Capacitor) builds already ship everything locally, so skip it there.
if (!('Capacitor' in window)) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
