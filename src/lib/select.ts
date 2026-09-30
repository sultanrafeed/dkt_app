import type { ExamConfig, QProgress, Question } from './types'
import { isDue, mastery } from './progress'

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick n questions spread evenly across categories (round-robin over shuffled groups). */
export function balanced(qs: Question[], n: number): Question[] {
  const groups = new Map<string, Question[]>()
  for (const q of shuffle(qs)) groups.set(q.category, [...(groups.get(q.category) ?? []), q])
  const lists = shuffle([...groups.values()])
  const out: Question[] = []
  while (out.length < Math.min(n, qs.length)) {
    for (const l of lists) {
      const q = l.shift()
      if (q && out.length < n) out.push(q)
    }
  }
  return shuffle(out)
}

/**
 * Priority weight for adaptive practice: mistakes, weak and due questions come up
 * far more often; mastered questions rarely.
 */
export function weight(p: QProgress | undefined, now = Date.now()): number {
  const m = mastery(p)
  if (m === 'new') return 3
  let w = 1
  if (m === 'dontknow') w += 20
  if (p!.incorrect) w += 2 * Math.min(p!.incorrect, 4)
  if (isDue(p, now)) w += 4
  if (m === 'learning') w += 2
  if (m === 'almost') w += 1
  if (m === 'mastered') w = isDue(p, now) ? 1 : 0.2
  return w
}

/** Weighted sampling without replacement. */
export function weighted(qs: Question[], n: number, progress: Record<string, QProgress>): Question[] {
  const pool = qs.map((q) => ({ q, w: weight(progress[q.id]) }))
  const out: Question[] = []
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0)
    let r = Math.random() * total
    let i = 0
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w
      if (r <= 0) break
    }
    out.push(pool[i].q)
    pool.splice(i, 1)
  }
  return out
}

/** Random display order of a question's options (original indexes). */
export function optionOrder(q: Question, doShuffle: boolean): number[] {
  const idx = q.options.map((_, i) => i)
  return doShuffle ? shuffle(idx) : idx
}

/** Build a mock exam: each part draws its count at random, category-balanced, no duplicates. */
export function buildExam(all: Question[], cfg: ExamConfig, progress?: Record<string, QProgress>, preferWeak = false) {
  const used = new Set<string>()
  const ids: string[] = []
  const partOf: Record<string, number> = {}
  cfg.parts.forEach((part, pi) => {
    const pool = all.filter((q) => part.sections.includes(q.section) && !used.has(q.id))
    const picked = preferWeak && progress ? weighted(pool, part.count, progress) : balanced(pool, part.count)
    for (const q of picked) {
      used.add(q.id)
      ids.push(q.id)
      partOf[q.id] = pi
    }
  })
  return { ids, partOf }
}
