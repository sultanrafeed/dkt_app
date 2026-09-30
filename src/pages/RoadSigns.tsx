import { useState } from 'react'
import { useData, isSignQuestion } from '../lib/data'
import { useStore } from '../lib/store'
import { weighted, shuffle } from '../lib/select'
import { startPractice } from '../lib/session'
import { MasteryBadge, Dialog, SourceRefs } from '../components/ui'
import type { Question } from '../lib/types'

export default function RoadSigns() {
  const { questions } = useData()
  const progress = useStore((s) => s.progress)
  const signs = questions.filter(isSignQuestion)
  const pictures = questions.filter((q) => q.image)
  const [open, setOpen] = useState<Question | null>(null)
  const [shown, setShown] = useState(false)
  return (
    <div className="stack">
      <header>
        <h1>Road Signs &amp; Pictures</h1>
        <p className="muted">{signs.length} questions show a road sign; {pictures.length} questions have a picture you need to read (signs, intersections, lane diagrams, mirrors, photos). Meanings are the official answers from the question document.</p>
      </header>
      <section className="card">
        <div className="row gap wrap">
          <button className="btn primary big" onClick={() => startPractice('Road signs', weighted(signs, signs.length, progress))}>Sign quiz ({signs.length})</button>
          <button className="btn big" onClick={() => startPractice('Picture questions', weighted(pictures, 30, progress))}>Picture questions (30 at a time)</button>
          <button className="btn big" onClick={() => startPractice('All picture questions', shuffle(pictures))}>All {pictures.length} picture questions</button>
        </div>
      </section>
      <section>
        <h2 className="h3">Sign gallery</h2>
        <p className="small muted">Tap a sign, say what it means out loud, then reveal the official answer.</p>
        <ul className="sign-grid">
          {signs.map((q) => (
            <li key={q.id}>
              <button className="sign-tile" onClick={() => { setOpen(q); setShown(false) }} aria-label={`Sign from question ${q.code}`}>
                <img src={`./${q.image!.src}`} alt={q.image!.alt} loading="lazy" />
                <span className="small">{q.code}</span>
                <MasteryBadge id={q.id} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `Sign – ${open.code}` : ''} wide>
        {open && (
          <div className="stack">
            <img className="sign-big" src={`./${open.image!.src}`} alt={open.image!.alt} />
            <p className="qtext">{open.question}</p>
            {shown ? (
              <>
                <p className="answer-line right-line">✓ Official answer: <strong>{open.options[open.correctIndex]}</strong></p>
                <SourceRefs q={open} />
              </>
            ) : (
              <button className="btn primary" onClick={() => setShown(true)}>Reveal meaning</button>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
