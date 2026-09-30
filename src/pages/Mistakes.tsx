import { useState } from 'react'
import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { isRepeatMistake, isWeak, pct, accuracy } from '../lib/progress'
import { startPractice } from '../lib/session'
import { href } from '../lib/router'
import { Empty, History, QImage, SourceRefs } from '../components/ui'

export default function Mistakes() {
  const { questions } = useData()
  const progress = useStore((s) => s.progress)
  const [tab, setTab] = useState<'weak' | 'repeat' | 'ever'>('weak')
  const lists = {
    weak: questions.filter((q) => isWeak(progress[q.id])),
    repeat: questions.filter((q) => isRepeatMistake(progress[q.id])),
    ever: questions.filter((q) => (progress[q.id]?.incorrect ?? 0) > 0),
  }
  const list = [...lists[tab]].sort((a, b) => (progress[b.id]?.incorrect ?? 0) - (progress[a.id]?.incorrect ?? 0))
  return (
    <div className="stack">
      <header>
        <h1>Mistakes</h1>
        <p className="muted">Every question you've answered wrong. A question leaves "Current mistakes" once you get it right again and your accuracy on it is 75% or more.</p>
      </header>
      <div className="tabs" role="tablist">
        {([['weak', 'Current mistakes'], ['repeat', 'Keep getting wrong'], ['ever', 'Ever wrong']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} ({lists[k].length})</button>
        ))}
      </div>
      {list.length ? (
        <>
          <button className="btn primary big" onClick={() => startPractice(tab === 'repeat' ? 'Questions I keep getting wrong' : 'Retry mistakes', list, { revealMode: 'immediate' })}>
            ↺ Retry all {list.length}
          </button>
          {list.map((q) => {
            const p = progress[q.id]!
            return (
              <article key={q.id} className="card review bad">
                <div className="qmeta">
                  <a className="code" href={href(`/q/${q.id}`)}>{q.code}</a><span className="chip">{q.category}</span>
                  <span className="small">Wrong {p.incorrect}× · accuracy {pct(accuracy(p))}</span> <History id={q.id} />
                </div>
                <h3 className="qtext">{q.question}</h3>
                <QImage q={q} />
                <p className="answer-line right-line">✓ Official answer: <strong>{q.options[q.correctIndex]}</strong></p>
                <SourceRefs q={q} />
                <button className="btn" onClick={() => startPractice(`Again: ${q.code}`, [q], { revealMode: 'immediate' })}>Practise this again</button>
              </article>
            )
          })}
        </>
      ) : (
        <Empty>
          <p>No questions here yet.</p>
          <a className="btn primary" href={href('/practice')}>Go to Practice</a>
        </Empty>
      )}
    </div>
  )
}
