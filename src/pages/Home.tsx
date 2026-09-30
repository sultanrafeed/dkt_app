import { useMemo } from 'react'
import { useData } from '../lib/data'
import { getState, useStore } from '../lib/store'
import { overview, pct, studyStreak, isWeak } from '../lib/progress'
import { buildExam, weighted } from '../lib/select'
import { startExam, startPractice } from '../lib/session'
import { href, navigate } from '../lib/router'
import { Bar } from '../components/ui'
import { SOURCE_NOTICE } from '../lib/settings'

export default function Home() {
  const { questions } = useData()
  const s = useStore((x) => x)
  const o = useMemo(() => overview(questions, s), [questions, s])
  const streak = studyStreak(s.studyDays)
  const weakQs = questions.filter((q) => isWeak(s.progress[q.id]))

  const continueLearning = () => {
    if (getState().active) return navigate('/session')
    // Due reviews first, then unseen, then weak — the adaptive mix.
    startPractice('Continue learning', weighted(questions, 20, getState().progress))
  }

  return (
    <div className="stack">
      <section className="hero card">
        <p className="eyebrow">NSW DKT Trainer · Class C (car)</p>
        <h1>Your goal: be fully prepared.</h1>
        <p className="muted">All {questions.length} questions from the official question document, with every picture, checked against the Road User Handbook.</p>
        <div className="stats-row">
          <div className="stat"><span className="stat-n">{o.answers ? pct(o.accuracy) : '—'}</span><span className="stat-l">Overall accuracy</span></div>
          <div className="stat"><span className="stat-n">{o.mastered} / {o.total}</span><span className="stat-l">Questions mastered</span></div>
          <div className="stat"><span className="stat-n">{o.attempted}</span><span className="stat-l">Attempted</span></div>
          <div className="stat"><span className="stat-n">{streak}</span><span className="stat-l">Day streak</span></div>
          <div className="stat"><span className="stat-n">{s.run.current}</span><span className="stat-l">Correct in a row</span></div>
        </div>
        <Bar value={o.mastered / o.total} label="Questions mastered" tone="good" />
        <p className="small muted">{o.total - o.attempted} questions not yet attempted · {o.due} due for review · {o.weak} weak</p>
      </section>

      {s.active && (
        <section className="card notice-card">
          <p><strong>Session in progress:</strong> {s.active.title} — question {s.active.idx + 1} of {s.active.ids.length}.</p>
          <a className="btn primary" href={href('/session')}>Resume</a>
        </section>
      )}

      <section className="action-grid" aria-label="Start studying">
        <button className="action primary" onClick={continueLearning}>
          <span className="action-t">Continue learning</span>
          <span className="action-d">{s.active ? 'Resume your session' : '20 questions picked for you: due reviews, new and weak questions'}</span>
        </button>
        <button className="action" disabled={!weakQs.length} onClick={() => startPractice('Weak areas', weighted(weakQs, 20, s.progress))}>
          <span className="action-t">Practise weak areas</span>
          <span className="action-d">{weakQs.length ? `${weakQs.length} questions need work` : 'Nothing weak yet — keep practising'}</span>
        </button>
        <button className="action" onClick={() => { const e = buildExam(questions, s.settings.exam); startExam('Mock DKT', e.ids.map((id) => questions.find((q) => q.id === id)!), e.partOf, s.settings.exam) }}>
          <span className="action-t">Start mock test</span>
          <span className="action-d">Exam conditions: no hints until you submit</span>
        </button>
        <a className="action" href={href('/full-marks')}>
          <span className="action-t">Full Marks Training</span>
          <span className="action-d">Step-by-step plan from learning to exam-ready</span>
        </a>
        <a className="action" href={href('/mistakes')}>
          <span className="action-t">Review mistakes</span>
          <span className="action-d">Everything you've got wrong, in one place</span>
        </a>
        <a className="action" href={href('/learn')}>
          <span className="action-t">Learn the rules</span>
          <span className="action-d">Road User Handbook, section by section</span>
        </a>
      </section>

      <p className="notice small" role="note">{SOURCE_NOTICE}</p>
    </div>
  )
}
