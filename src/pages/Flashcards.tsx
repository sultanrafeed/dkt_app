import { useEffect, useMemo, useState } from 'react'
import { useData, isSignQuestion } from '../lib/data'
import { getState, useStore } from '../lib/store'
import { setConfidence } from '../lib/progress'
import { shuffle } from '../lib/select'
import { QImage, SourceRefs, Empty } from '../components/ui'

type Deck = 'all' | 'signs' | 'images' | 'review' | 'unsure' | string

/**
 * Flashcards made from the source questions: the front is the official question
 * (and picture), the back is the official answer. Nothing is invented.
 */
export default function Flashcards() {
  const { questions } = useData()
  const progress = useStore((s) => s.progress)
  const [deck, setDeck] = useState<Deck>('all')
  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions])
  const [cards, setCards] = useState<string[]>([])
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const build = (d: Deck) => {
    const prog = getState().progress
    const pool = questions.filter((q) =>
      d === 'all' ? true
      : d === 'signs' ? isSignQuestion(q)
      : d === 'images' ? !!q.image
      : d === 'review' ? prog[q.id]?.confidence === 'review'
      : d === 'unsure' ? prog[q.id]?.confidence === 'unsure' || prog[q.id]?.confidence === 'review'
      : q.category === d)
    setCards(shuffle(pool.map((q) => q.id)))
    setI(0)
    setFlipped(false)
  }
  useEffect(() => build(deck), [deck]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = questions.find((x) => x.id === cards[i])
  const rate = (c: 'known' | 'unsure' | 'review') => {
    if (!q) return
    setConfidence(q.id, c)
    setFlipped(false)
    setI((n) => Math.min(n + 1, cards.length))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]') || (e.target as HTMLElement).tagName === 'SELECT') return
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) }
      if (e.key === 'ArrowRight') { setFlipped(false); setI((n) => Math.min(n + 1, cards.length)) }
      if (e.key === 'ArrowLeft') { setFlipped(false); setI((n) => Math.max(n - 1, 0)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cards.length])

  const counts = { known: 0, unsure: 0, review: 0 }
  for (const id of cards) { const c = progress[id]?.confidence; if (c) counts[c]++ }

  return (
    <div className="stack">
      <header>
        <h1>Flashcards</h1>
        <p className="muted">Front: the official question. Back: the official answer. Rate yourself honestly — "Unsure" and "Need to review" cards get their own deck.</p>
      </header>
      <div className="row gap wrap">
        <label className="field inline">
          <span>Deck</span>
          <select value={deck} onChange={(e) => setDeck(e.target.value)}>
            <option value="all">All questions ({questions.length})</option>
            <option value="signs">Road signs</option>
            <option value="images">Picture questions</option>
            <option value="unsure">Unsure + need review</option>
            <option value="review">Need review only</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button className="btn" onClick={() => build(deck)}>Shuffle</button>
        <span className="small muted">✓ {counts.known} known · ? {counts.unsure} unsure · ↺ {counts.review} to review</span>
      </div>

      {!cards.length ? (
        <Empty>No cards in this deck yet.</Empty>
      ) : !q ? (
        <Empty>
          <h2>Deck finished</h2>
          <p>You rated {cards.length} cards.</p>
          <div className="row gap wrap center-row">
            <button className="btn primary" onClick={() => setDeck('unsure')}>Study unsure cards</button>
            <button className="btn" onClick={() => build(deck)}>Go again</button>
          </div>
        </Empty>
      ) : (
        <>
          <p className="small muted" aria-live="polite">Card {i + 1} of {cards.length}</p>
          <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
            <div className="fc-face">
              <div className="qmeta"><span className="code">{q.code}</span><span className="chip">{q.category}</span></div>
              <h2 className="qtext">{q.question}</h2>
              <QImage q={q} />
              {!flipped && <button className="btn primary big" onClick={() => setFlipped(true)}>Reveal answer (Space)</button>}
              {flipped && (
                <div className="fc-back" aria-live="polite">
                  <p className="answer-line right-line">✓ Official answer: <strong>{q.options[q.correctIndex]}</strong></p>
                  <SourceRefs q={q} />
                </div>
              )}
            </div>
          </div>
          {flipped && (
            <div className="row gap wrap rate">
              <button className="btn good" onClick={() => rate('known')}>✓ Known</button>
              <button className="btn warn" onClick={() => rate('unsure')}>? Unsure</button>
              <button className="btn bad" onClick={() => rate('review')}>↺ Need to review</button>
            </div>
          )}
          <div className="session-nav">
            <button className="btn" disabled={i === 0} onClick={() => { setFlipped(false); setI(i - 1) }}>← Previous</button>
            <button className="btn" onClick={() => { setFlipped(false); setI(i + 1) }}>Next →</button>
          </div>
        </>
      )}
    </div>
  )
}
