import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { buildExam } from '../lib/select'
import { startExam } from '../lib/session'
import { EXAM_CONFIG_NOTICE } from '../lib/settings'
import { href } from '../lib/router'
import { pct } from '../lib/progress'

export default function Mock() {
  const { questions, byId } = useData()
  const cfg = useStore((s) => s.settings.exam)
  const progress = useStore((s) => s.progress)
  const sessions = useStore((s) => s.sessions)
  const exams = sessions.filter((x) => x.kind === 'exam')
  const total = cfg.parts.reduce((n, p) => n + p.count, 0)

  const go = (preferWeak: boolean) => {
    const e = buildExam(questions, cfg, progress, preferWeak)
    startExam(preferWeak ? 'Mock DKT (weak-focused)' : 'Mock DKT', e.ids.map((id) => byId.get(id)!), e.partOf, cfg)
  }

  return (
    <div className="stack">
      <header>
        <h1>Mock Test</h1>
        <p className="muted">A realistic test: questions are drawn at random, balanced across categories, with no duplicates. You won't see answers, explanations or hints until you submit.</p>
      </header>
      <section className="card">
        <h2 className="h3">This test</h2>
        <ul className="plain">
          {cfg.parts.map((p) => (
            <li key={p.label}><strong>{p.label}:</strong> {p.count} questions — pass needs {p.passMark} correct <span className="muted small">(from: {p.sections.join(', ')})</span></li>
          ))}
          <li><strong>Total:</strong> {total} questions · {cfg.timeLimit ? `${cfg.timeLimit}-minute time limit` : 'no time limit (timer counts up)'}</li>
        </ul>
        <p className="notice small" role="note">⚙ {EXAM_CONFIG_NOTICE} <a href={href('/settings')}>Change in Settings</a>.</p>
        <div className="row gap wrap">
          <button className="btn primary big" onClick={() => go(false)}>Start mock test</button>
          <button className="btn big" onClick={() => go(true)}>Start weak-focused mock</button>
        </div>
      </section>
      {exams.length > 0 && (
        <section className="card">
          <h2 className="h3">Previous mock tests</h2>
          <table className="table">
            <thead><tr><th>Date</th><th>Score</th><th>Result</th><th></th></tr></thead>
            <tbody>
              {exams.slice(0, 10).map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.finishedAt).toLocaleString()}</td>
                  <td>{e.correct}/{e.total} ({pct(e.correct / e.total)})</td>
                  <td>{e.passed ? '✓ Pass' : '✗ Fail'}</td>
                  <td><a href={href(`/results/${e.id}`)}>Review</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
