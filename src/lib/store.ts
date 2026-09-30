import { useSyncExternalStore } from 'react'
import type { ActiveSession, QProgress, SessionRecord, Settings } from './types'
import { DEFAULT_SETTINGS } from './settings'

/**
 * All learner data lives on the device (localStorage). No account needed.
 * Every read/write is guarded so private browsing or blocked storage still works
 * for the current visit.
 */
const KEY = 'dkt.v1'

export interface Report {
  id: string
  questionId: string
  text: string
  at: number
}

export interface State {
  progress: Record<string, QProgress>
  sessions: SessionRecord[]
  settings: Settings
  active: ActiveSession | null
  learnViewed: Record<string, number>
  reports: Report[]
  /** Consecutive correct answers across all practice, and the best run. */
  run: { current: number; best: number }
  /** Days (YYYY-MM-DD) with at least one answered question. */
  studyDays: string[]
}

const empty = (): State => ({
  progress: {},
  sessions: [],
  settings: DEFAULT_SETTINGS,
  active: null,
  learnViewed: {},
  reports: [],
  run: { current: 0, best: 0 },
  studyDays: [],
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<State>
    const base = empty()
    return {
      ...base,
      ...parsed,
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
        exam: parsed.settings?.exam ?? base.settings.exam,
        readiness: { ...base.settings.readiness, ...(parsed.settings?.readiness ?? {}) },
      },
    }
  } catch {
    return empty()
  }
}

let state: State = load()
const listeners = new Set<() => void>()

export function getState(): State {
  return state
}

export function setState(update: (s: State) => State) {
  state = update(state)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l())
}

export function replaceState(next: State) {
  setState(() => ({ ...empty(), ...next }))
}

export function resetState() {
  const settings = state.settings
  setState(() => ({ ...empty(), settings }))
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}
