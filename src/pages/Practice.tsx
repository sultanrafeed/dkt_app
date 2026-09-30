import { useMemo, useState } from 'react'
import { useData, isSignQuestion } from '../lib/data'
import { useStore } from '../lib/store'
import { isDue, isRepeatMistake, isWeak, mastery } from '../lib/progress'
import { balanced, shuffle, weighted } from '../lib/select'
import { startPractice } from '../lib/session'
import type { Question } from '../lib/types'

type Pool = 'all' | 'unseen' | 'weak' | 'mistakes' | 'due' | 'bookmarked' | 'flagged' | 'images' | 'signs' | 'notMastered'
type Order = 'adaptive' | 'random' | 'balanced' | 'source'

const POOLS: { id: Pool; label: string; hint: string }[] = [
  { id: 'all', label: 'All questions', hint: 'The whole bank' },
  { id: 'unseen', label: 'Unseen', hint: "Questions you haven't tried" },
  { id: 'weak', label: 'Weak questions', hint: 'Recently wrong or under 75%' },
  { id: 'mistakes', label: 'Keep getting wrong', hint: 'Wrong 2+ times, not yet mastered' },
  { id: 'due', label: 'Due for review', hint: 'Spaced-repetition reviews due now' },
  { id: 'notMastered', label: 'Not mastered', hint: 'Everything not yet mastered' },
  { id: 'images', label: 'Picture questions', hint: 'Diagrams, photos and signs' },
  { id: 'signs', label: 'Road signs', hint: 'Questions showing a sign' },
  { id: 'bookmarked', label: 'Bookmarked', hint: 'Your starred questions' },
  { id: 'flagged', label: 'Marked for review', hint: 'Questions you flagged' },
]

export default function Practice({ initialPool }: { initialPool?: string }) {
  const { questions, handbook } = useData()
  const progress = useStore((s) => s.progress)
  const settings = useStore((s) => s.settings)
  const [pool, setPool] = useState<Pool>((initialPool as Pool) || 'all')
  const [cats, setCats] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(20)
  const [order, setOrder] = useState<Order>('adaptive')
  const [reveal, setReveal] = useState(settings.revealMode)

  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions])
  const topics = useMemo(() => {
    const m = new Map<string, { id: string; title: string; n: number }>()
    for (const q of questions) for (const t of q.topics) m.set(t.id, { id: t.id, title: t.title, n: (m.get(t.id)?.n ?? 0) + 1 })
    const orderIdx = new Map(handbook?.sections.map((s, i) => [s.id, i]))
    return [...m.values()].sort((a, b) => (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0))
  }, [questions, handbook])

  const filtered = useMemo(() => {
    const now = Date.now()
    const test: Record<Pool, (q: Question) => boolean> = {
      all: () => true,
      unseen: (q) => !progress[q.id]?.attempts,
      weak: (q) => isWeak(progress[q.id]),
      mistakes: (q) => isRepeatMistake(progress[q.id]),
      due: (q) => isDue(progress[q.id], now),
      notMastered: (q) => mastery(progress[q.id]) !== 'mastered',
      images: (q) => !!q.image,
      signs: isSignQuestion,
      bookmarked: (q) => !!progress[q.id]?.bookmarked,
      flagged: (q) => !!progress[q.id]?.flagged,
    }
    return questions.filter((q) => test[pool](q) && (!cats.length || cats.includes(q.category)) && (!topic || q.topics.some((t) => t.id === topic)))
  }, [questions, progress, pool, cats, topic])

  const start = () => {
    const n = Math.min(count || filtered.length, filtered.length)
    const picked =
      order === 'adaptive' ? weighted(filtered, n, progress)
      : order === 'balanced' ? balanced(filtered, n)
      : order === 'random' ? shuffle(filtered).slice(0, n)
      : filtered.slice(0, n)
    const label = [POOLS.find((p) => p.id === pool)!.label, cats.length === 1 ? cats[0] : cats.length ? `${cats.length} categories` : '', topics.find((t) => t.id === topic)?.title ?? '']
      .filter(Boolean).join(' · ')
    startPractice(label, picked, { revealMode: reveal })
  }

  return (
    <div className="stack">
      <header>
        <h1>Practice</h1>
        <p className="muted">Build a set of questions. Every question comes from the official question document; the official answer is the bold option in that document.</p>
      </header>

      <section className="card">
        <h2 className="h3">1. Which questions?</h2>
        <div className="chip-grid" role="radiogroup" aria-label="Question pool">
          {POOLS.map((p) => (
            <button key={p.id} role="radio" aria-checked={pool === p.id} className={`choice ${pool === p.id ? 'on' : ''}`} onClick={() => setPool(p.id)}>
              <strong>{p.label}</strong><span className="small muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h3">2. Narrow down (optional)</h2>
        <fieldset className="field">
          <legend>Official categories</legend>
          <div className="row wrap gap-s">
            {categories.map((c) => {
              const on = cats.includes(c)
              return (
                <button key={c} className={`chip-btn ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setCats(on ? cats.filter((x) => x !== c) : [...cats, c])}>
                  {on ? '✓ ' : ''}{c}
                </button>
              )
            })}
          </div>
        </fieldset>
        <label className="field">
          <span>Handbook topic</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Any topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.n})</option>)}
          </select>
        </label>
      </section>

      <section className="card">
        <h2 className="h3">3. How?</h2>
        <div className="grid-2">
          <label className="field">
            <span>Number of questions</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[10, 20, 30, 45, 60, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              <option value={0}>All matching</option>
            </select>
          </label>
          <label className="field">
            <span>Order</span>
            <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
              <option value="adaptive">Adaptive — weak, due and new first</option>
              <option value="balanced">Random, balanced across categories</option>
              <option value="random">Fully random</option>
              <option value="source">Source order (as in the PDF)</option>
            </select>
          </label>
          <label className="field">
            <span>Feedback</span>
            <select value={reveal} onChange={(e) => setReveal(e.target.value as 'immediate' | 'end')}>
              <option value="immediate">Show answer after each question</option>
              <option value="end">Show answers at the end</option>
            </select>
          </label>
        </div>
      </section>

      <div className="sticky-cta">
        <button className="btn primary big" disabled={!filtered.length} onClick={start}>
          {filtered.length ? `Start ${Math.min(count || filtered.length, filtered.length)} questions` : 'No questions match'}
        </button>
        <span className="small muted">{filtered.length} matching</span>
      </div>
    </div>
  )
}
