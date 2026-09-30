import { useSyncExternalStore } from 'react'

/** Minimal hash router — works from file://, sub-folders, GitHub Pages and Capacitor. */
function current() {
  const h = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = h.split('?')
  return { path, query: new URLSearchParams(query) }
}

let snap = current()
let key = window.location.hash
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  snap = current()
  key = window.location.hash
  listeners.forEach((l) => l())
  window.scrollTo(0, 0)
})

export function useRoute() {
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => key,
  )
  return snap
}

export function navigate(to: string) {
  window.location.hash = to
}

export const href = (to: string) => `#${to}`
