import type { Mastery, QProgress, Question, SessionRecord } from './types'
import { getState, setState, type State } from './store'

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN
/** Review interval for each spaced-repetition box. */
export const INTERVALS = [0, 10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY]

export const today = (t = Date.now()) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const blank = (): QProgress => ({ attempts: 0, correct: 0, incorrect: 0, streak: 0, box: 0, history: [] })

/**
 * Apply one answer to a question's record.
 * The box (spaced-repetition level) can only move up once per day after box 2,
 * so "mastered" (box 4 + 3 correct in a row) needs correct answers on at least
 * three different days — never a single lucky answer.
 */
export function applyAnswer(p: QProgress, ok: boolean, now = Date.now()): QProgress {
  const day = today(now)
  const next: QProgress = { ...p, history: [...p.history, ok ? 1 : 0].slice(-12) }
  next.attempts++
  next.lastAttempted = now
  if (ok) {
    next.correct++
    next.streak++
    next.lastResult = 'correct'
    if (next.box < 2 || next.lastBoxDay !== day) {
      next.box = Math.min(5, next.box + 1)
      next.lastBoxDay = day
    }
  } else {
    next.incorrect++
    next.streak = 0
    next.lastResult = 'incorrect'
    next.box = 1
    next.lastBoxDay = day
  }
  next.nextDue = now + INTERVALS[next.box]
  return next
}

export function mastery(p?: QProgress): Mastery {
  if (!p || p.attempts === 0) return 'new'
  if (p.lastResult === 'incorrect') return 'dontknow'
  if (p.box >= 4 && p.streak >= 3) return 'mastered'
  if (p.box >= 3 || p.streak >= 2) return 'almost'
  return 'learning'
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: 'Not seen',
  dontknow: "Don't know",
  learning: 'Learning',
  almost: 'Almost mastered',
  mastered: 'Mastered',
}

export const MASTERY_ICON: Record<Mastery, string> = {
  new: '○',
  dontknow: '✗',
  learning: '!',
  almost: '◐',
  mastered: '✓',
}

export const accuracy = (p?: QProgress) => (p && p.attempts ? p.correct / p.attempts : 0)

/** Answered wrong most recently, or wrong more than a quarter of the time. */
export const isWeak = (p?: QProgress) => !!p && p.incorrect > 0 && (p.lastResult === 'incorrect' || accuracy(p) < 0.75)
/** Answered wrong at least twice. */
export const isRepeatMistake = (p?: QProgress) => !!p && p.incorrect >= 2 && mastery(p) !== 'mastered'
export const isDue = (p?: QProgress, now = Date.now()) => !!p && p.attempts > 0 && (p.nextDue ?? 0) <= now

export function recordAnswers(answers: { id: string; ok: boolean }[]) {
  if (!answers.length) return
  setState((s) => {
    const progress = { ...s.progress }
    let { current, best } = s.run
    for (const a of answers) {
      progress[a.id] = applyAnswer(progress[a.id] ?? blank(), a.ok)
      current = a.ok ? current + 1 : 0
      best = Math.max(best, current)
    }
    const d = today()
    const studyDays = s.studyDays.includes(d) ? s.studyDays : [...s.studyDays, d].slice(-400)
    return { ...s, progress, run: { current, best }, studyDays }
  })
}

export function toggleBookmark(id: string) {
  setState((s) => {
    const p = s.progress[id] ?? blank()
    return { ...s, progress: { ...s.progress, [id]: { ...p, bookmarked: !p.bookmarked } } }
  })
}

export function toggleFlag(id: string) {
  setState((s) => {
    const p = s.progress[id] ?? blank()
    return { ...s, progress: { ...s.progress, [id]: { ...p, flagged: !p.flagged } } }
  })
}

export function setConfidence(id: string, confidence: QProgress['confidence']) {
  setState((s) => {
    const p = s.progress[id] ?? blank()
    return { ...s, progress: { ...s.progress, [id]: { ...p, confidence } } }
  })
}

export function saveSession(rec: SessionRecord) {
  setState((s) => ({ ...s, sessions: [rec, ...s.sessions].slice(0, 60) }))
}

export function markLearnViewed(sectionId: string) {
  const s = getState()
  if (s.learnViewed[sectionId]) return
  setState((st) => ({ ...st, learnViewed: { ...st.learnViewed, [sectionId]: Date.now() } }))
}

/** Consecutive study days ending today (or yesterday, if today not yet studied). */
export function studyStreak(days: string[]): number {
  const set = new Set(days)
  let t = Date.now()
  if (!set.has(today(t))) t -= DAY
  let n = 0
  while (set.has(today(t))) {
    n++
    t -= DAY
  }
  return n
}

export interface GroupStat {
  key: string
  total: number
  attempted: number
  answers: number
  correct: number
  mastered: number
  accuracy: number
  coverage: number
}

export function groupStats(questions: Question[], progress: State['progress'], keyOf: (q: Question) => string[]): GroupStat[] {
  const m = new Map<string, GroupStat>()
  for (const q of questions) {
    for (const key of keyOf(q)) {
      const g = m.get(key) ?? { key, total: 0, attempted: 0, answers: 0, correct: 0, mastered: 0, accuracy: 0, coverage: 0 }
      const p = progress[q.id]
      g.total++
      if (p?.attempts) {
        g.attempted++
        g.answers += p.attempts
        g.correct += p.correct
      }
      if (mastery(p) === 'mastered') g.mastered++
      m.set(key, g)
    }
  }
  return [...m.values()].map((g) => ({ ...g, accuracy: g.answers ? g.correct / g.answers : 0, coverage: g.attempted / g.total }))
}

export interface Overview {
  total: number
  attempted: number
  answers: number
  correct: number
  accuracy: number
  mastered: number
  weak: number
  due: number
  byMastery: Record<Mastery, number>
  /** Accuracy over the most recent answers (up to 100) across practice & tests. */
  recentAccuracy: number
  recentCount: number
}

export function overview(questions: Question[], s: State): Overview {
  const byMastery: Record<Mastery, number> = { new: 0, dontknow: 0, learning: 0, almost: 0, mastered: 0 }
  let attempted = 0, answers = 0, correct = 0, weak = 0, due = 0
  const now = Date.now()
  for (const q of questions) {
    const p = s.progress[q.id]
    byMastery[mastery(p)]++
    if (p?.attempts) {
      attempted++
      answers += p.attempts
      correct += p.correct
    }
    if (isWeak(p)) weak++
    if (isDue(p, now)) due++
  }
  const recent: boolean[] = []
  for (const sess of s.sessions) {
    for (const a of sess.answers) {
      if (a.chosen !== null) recent.push(a.correct)
      if (recent.length >= 100) break
    }
    if (recent.length >= 100) break
  }
  return {
    total: questions.length,
    attempted,
    answers,
    correct,
    accuracy: answers ? correct / answers : 0,
    mastered: byMastery.mastered,
    weak,
    due,
    byMastery,
    recentAccuracy: recent.length ? recent.filter(Boolean).length / recent.length : 0,
    recentCount: recent.length,
  }
}

export const pct = (x: number) => `${Math.round(x * 100)}%`
