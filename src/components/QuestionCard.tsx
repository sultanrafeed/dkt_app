import type { Question } from '../lib/types'
import { QImage } from './ui'

interface Props {
  q: Question
  order: number[]
  chosen: number | undefined
  reveal: boolean
  onChoose: (original: number) => void
  locked?: boolean
  number?: string
}

/** A question with its picture and answer choices (a single-choice radio group). */
export function QuestionCard({ q, order, chosen, reveal, onChoose, locked, number }: Props) {
  const name = `q-${q.id}`
  return (
    <article className="qcard" aria-labelledby={`${name}-text`}>
      <div className="qmeta">
        <span className="code">{q.code}</span>
        <span className="chip">{q.category}</span>
        {number && <span className="muted small">{number}</span>}
      </div>
      <h2 id={`${name}-text`} className="qtext">{q.question}</h2>
      <QImage q={q} />
      <div role="radiogroup" aria-labelledby={`${name}-text`} className="options">
        {order.map((orig, i) => {
          const isChosen = chosen === orig
          const isCorrect = orig === q.correctIndex
          let cls = 'option'
          let tag = ''
          if (reveal && isCorrect) { cls += ' correct'; tag = '✓ Official answer' }
          else if (reveal && isChosen) { cls += ' wrong'; tag = '✗ Your answer' }
          else if (isChosen) cls += ' chosen'
          return (
            <button
              key={orig}
              role="radio"
              aria-checked={isChosen}
              className={cls}
              disabled={locked}
              onClick={() => onChoose(orig)}
            >
              <span className="optnum" aria-hidden>{i + 1}</span>
              <span className="opttext">{q.options[orig]}</span>
              {tag && <span className="opttag">{tag}</span>}
              {reveal && isChosen && isCorrect && <span className="opttag">Your answer</span>}
            </button>
          )
        })}
      </div>
    </article>
  )
}
