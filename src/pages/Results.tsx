import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { startPractice } from '../lib/session'
import { groupStats, pct } from '../lib/progress'
import { href } from '../lib/router'
import { Bar, Empty, QImage, SourceRefs, toneFor } from '../components/ui'
import type { SessionRecord } from '../lib/types'

export default function Results({ id }: { id: string }) {
  const { byId } = useData()
  const rec = useStore((s) => s.sessions.find((x) => x.id === id))
  const [showAll, setShowAll] = useState(false)
  if (!rec) return <Empty><h1>Result not found</h1><p><a href={href('/progress')}>See all sessions</a></p></Empty>
  return <ResultView rec={rec} byId={byId} showAll={showAll} setShowAll={setShowAll} />
}

function ResultView({ rec, byId, showAll, setShowAll }: { rec: SessionRecord; byId: ReturnType<typeof useData>['byId']; showAll: boolean; setShowAll: (v: boolean) => void }) {
  const wrong = rec.answers.filter((a) => a.chosen !== null && !a.correct)
  const skipped = rec.answers.filter((a) => a.chosen === null)
  const answered = rec.total - skipped.length
  const mins = Math.round((rec.finishedAt - rec.startedAt) / 60000)
  const cats = useMemo(() => {
    const qs = rec.answers.map((a) => byId.get(a.id)!).filter(Boolean)
    const prog = Object.fromEntries(rec.answers.map((a) => [a.id, { attempts: a.chosen === null ? 0 : 1, correct: a.correct ? 1 : 0, incorrect: a.correct ? 0 : 1, streak: 0, box: 0, history: [] }]))
    return groupStats(qs, prog, (q) => [q.category]).sort((a, b) => a.accuracy - b.accuracy)
  }, [rec, byId])
  const retryIds = [...wrong, ...(rec.kind === 'exam' ? skipped : [])].map((a) => byId.get(a.id)!).filter(Boolean)
  const list = showAll ? rec.answers : [...wrong, ...skipped]

  return (
    <div className="stack">
      <section className="card result-hero">
        <p className="eyebrow">{rec.kind === 'exam' ? 'Mock test result' : 'Session complete'}</p>
        <h1>{rec.title}</h1>
        {rec.kind === 'exam' && rec.passed !== undefined && (
          <p className={`verdict ${rec.passed ? 'pass' : 'fail'}`} role="status">
            {rec.passed ? '✓ PASS' : '✗ NOT YET A PASS'} <span className="small">(against your configured pass marks)</span>
          </p>
        )}
        <div className="stats-row">
          <div className="stat"><span className="stat-n">{rec.correct}/{rec.total}</span><span className="stat-l">Score</span></div>
          <div className="stat"><span className="stat-n">{pct(rec.total ? rec.correct / rec.total : 0)}</span><span className="stat-l">Percentage</span></div>
          <div className="stat"><span className="stat-n">{wrong.length}</span><span className="stat-l">Incorrect</span></div>
          <div className="stat"><span className="stat-n">{skipped.length}</span><span className="stat-l">{rec.kind === 'exam' ? 'Unanswered' : 'Skipped'}</span></div>
          <div className="stat"><span className="stat-n">{mins < 1 ? '<1' : mins} min</span><span className="stat-l">Time</span></div>
        </div>
        {rec.parts && (
          <table className="table">
            <thead><tr><th>Part</th><th>Score</th><th>Needed</th><th>Result</th></tr></thead>
            <tbody>
              {rec.parts.map((p) => (
                <tr key={p.label}><td>{p.label}</td><td>{p.correct}/{p.total}</td><td>{p.passMark}</td><td>{p.passed ? '✓ Pass' : '✗ Fail'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row gap wrap">
          {retryIds.length > 0 && (
            <button className="btn primary" onClick={() => startPractice(`Retry: ${rec.title}`, retryIds, { revealMode: 'immediate' })}>
              ↺ Retry all {retryIds.length} mistake{retryIds.length === 1 ? '' : 's'}
            </button>
          )}
          <a className="btn" href={href('/')}>Home</a>
          <a className="btn" href={href('/progress')}>Progress</a>
        </div>
      </section>

      {cats.length > 1 && answered > 0 && (
        <section className="card">
          <h2 className="h3">Breakdown by category</h2>
          <ul className="bars">
            {cats.map((c) => (
              <li key={c.key}>
                <div className="row between"><span>{c.key}</span><span>{c.correct}/{c.total}</span></div>
                <Bar value={c.total ? c.correct / c.total : 0} tone={toneFor(c.correct / c.total)} label={c.key} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack">
        <div className="row between wrap gap">
          <h2 className="h3">{showAll ? 'All answers' : wrong.length + skipped.length ? 'Review your mistakes' : 'No mistakes — well done!'}</h2>
          <button className="btn ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show mistakes only' : 'Show all answers'}</button>
        </div>
        {list.map((a) => {
          const q = byId.get(a.id)
          if (!q) return null
          return (
            <article key={a.id} className={`card review ${a.correct ? 'good' : 'bad'}`}>
              <div className="qmeta"><span className="code">{q.code}</span><span className="chip">{q.category}</span>
                <span className="small">{a.correct ? '✓ Correct' : a.chosen === null ? '— Not answered' : '✗ Incorrect'}</span></div>
              <h3 className="qtext">{q.question}</h3>
              <QImage q={q} />
              {a.chosen !== null && !a.correct && <p className="answer-line wrong-line">✗ Your answer: <strong>{q.options[a.chosen]}</strong></p>}
              <p className="answer-line right-line">✓ Official answer: <strong>{q.options[q.correctIndex]}</strong></p>
              <SourceRefs q={q} />
              {!a.correct && <button className="btn" onClick={() => startPractice(`Again: ${q.code}`, [q], { revealMode: 'immediate' })}>Practise this again</button>}
            </article>
          )
        })}
      </section>
    </div>
  )
}
