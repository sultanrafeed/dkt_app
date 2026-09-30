import { useMemo } from 'react'
import { useData } from '../lib/data'
import { setState, useStore } from '../lib/store'
import { groupStats, MASTERY_ICON, MASTERY_LABEL, overview, pct, studyStreak } from '../lib/progress'
import { achievements } from '../lib/goals'
import { weighted } from '../lib/select'
import { startPractice } from '../lib/session'
import { href } from '../lib/router'
import { Bar, toneFor } from '../components/ui'
import type { Mastery } from '../lib/types'

export default function Progress() {
  const { questions } = useData()
  const s = useStore((x) => x)
  const o = useMemo(() => overview(questions, s), [questions, s])
  const cats = useMemo(() => groupStats(questions, s.progress, (q) => [q.category]), [questions, s.progress])
  const topics = useMemo(
    () => groupStats(questions, s.progress, (q) => q.topics.map((t) => t.title)).filter((t) => t.answers >= 3).sort((a, b) => a.accuracy - b.accuracy),
    [questions, s.progress],
  )
  const weakCats = [...cats].filter((c) => c.answers > 0).sort((a, b) => a.accuracy - b.accuracy)
  const ach = achievements(questions, s)
  const goal = s.settings.goalAccuracy
  const order: Mastery[] = ['mastered', 'almost', 'learning', 'dontknow', 'new']

  return (
    <div className="stack">
      <header><h1>Progress</h1></header>

      <section className="card">
        <h2 className="h3">Overall progress</h2>
        <div className="stats-row">
          <div className="stat"><span className="stat-n">{o.attempted}</span><span className="stat-l">Questions attempted</span></div>
          <div className="stat"><span className="stat-n">{o.total - o.attempted}</span><span className="stat-l">Remaining</span></div>
          <div className="stat"><span className="stat-n">{o.answers ? pct(o.accuracy) : '—'}</span><span className="stat-l">Overall accuracy</span></div>
          <div className="stat"><span className="stat-n">{pct(o.mastered / o.total)}</span><span className="stat-l">Mastered</span></div>
          <div className="stat"><span className="stat-n">{studyStreak(s.studyDays)}</span><span className="stat-l">Study-day streak</span></div>
          <div className="stat"><span className="stat-n">{s.run.best}</span><span className="stat-l">Best correct run</span></div>
        </div>
        <div className="mastery-bar" aria-label="Mastery breakdown">
          {order.map((m) => o.byMastery[m] > 0 && (
            <span key={m} className={`seg m-${m}`} style={{ flex: o.byMastery[m] }} title={`${MASTERY_LABEL[m]}: ${o.byMastery[m]}`} />
          ))}
        </div>
        <ul className="legend">
          {order.map((m) => <li key={m}><span className={`sw m-${m}`} aria-hidden /> {MASTERY_ICON[m]} {MASTERY_LABEL[m]}: <strong>{o.byMastery[m]}</strong></li>)}
        </ul>
      </section>

      <section className="card">
        <h2 className="h3">Goal</h2>
        <label className="field inline">
          <span>I want to reach</span>
          <select value={goal} onChange={(e) => setState((st) => ({ ...st, settings: { ...st.settings, goalAccuracy: Number(e.target.value) } }))}>
            {[85, 90, 95, 98, 100].map((g) => <option key={g} value={g}>{g}%+</option>)}
          </select>
          <span>accuracy before my exam</span>
        </label>
        <p>Recent accuracy (last {o.recentCount} answers): <strong>{o.recentCount ? pct(o.recentAccuracy) : '—'}</strong> {o.recentCount >= 20 && (o.recentAccuracy * 100 >= goal ? '✓ goal reached' : `— ${Math.max(0, Math.ceil(goal - o.recentAccuracy * 100))} points to go`)}</p>
        <Bar value={o.recentCount ? o.recentAccuracy / (goal / 100) : 0} tone={o.recentAccuracy * 100 >= goal ? 'good' : undefined} label="Progress to goal" />
      </section>

      <section className="card">
        <div className="row between wrap gap">
          <h2 className="h3">Your weak areas</h2>
          {weakCats.length > 0 && (
            <button className="btn" onClick={() => {
              const worst = weakCats.slice(0, 2).map((c) => c.key)
              startPractice(`Weak areas: ${worst.join(', ')}`, weighted(questions.filter((q) => worst.includes(q.category)), 20, s.progress))
            }}>Practise weakest 2</button>
          )}
        </div>
        {weakCats.length ? (
          <ul className="bars">
            {weakCats.map((c) => (
              <li key={c.key}>
                <div className="row between"><span>{c.key}</span><span>{pct(c.accuracy)}</span></div>
                <Bar value={c.accuracy} tone={toneFor(c.accuracy)} label={`${c.key} accuracy`} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">Answer some questions to see your weak areas.</p>}
      </section>

      <section className="card">
        <h2 className="h3">Category performance</h2>
        <table className="table">
          <thead><tr><th>Category</th><th>Attempted</th><th>Accuracy</th><th>Mastered</th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.key}>
                <td><a href={href(`/bank?cat=${encodeURIComponent(c.key)}`)}>{c.key}</a></td>
                <td>{c.attempted}/{c.total}<Bar value={c.coverage} label={`${c.key} attempted`} /></td>
                <td>{c.answers ? pct(c.accuracy) : '—'}</td>
                <td>{c.mastered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {topics.length > 0 && (
        <section className="card">
          <h2 className="h3">Handbook topics needing attention</h2>
          <ul className="bars">
            {topics.slice(0, 8).map((t) => (
              <li key={t.key}>
                <div className="row between"><span>{t.key}</span><span>{pct(t.accuracy)} · {t.answers} answers</span></div>
                <Bar value={t.accuracy} tone={toneFor(t.accuracy)} label={`${t.key} accuracy`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="h3">Recent activity</h2>
        {s.sessions.length ? (
          <table className="table">
            <thead><tr><th>When</th><th>Session</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {s.sessions.slice(0, 12).map((x) => (
                <tr key={x.id}>
                  <td>{new Date(x.finishedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{x.kind === 'exam' ? '📝 ' : ''}{x.title}{x.passed !== undefined ? (x.passed ? ' · ✓ pass' : ' · ✗ fail') : ''}</td>
                  <td>{x.correct}/{x.total}</td>
                  <td><a href={href(`/results/${x.id}`)}>Review</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No sessions yet.</p>}
      </section>

      <section className="card">
        <h2 className="h3">Achievements ({ach.filter((a) => a.earned).length}/{ach.length})</h2>
        <ul className="achievements">
          {ach.map((a) => (
            <li key={a.id} className={a.earned ? 'earned' : ''}>
              <span className="ach-icon" aria-hidden>{a.earned ? '🏅' : '○'}</span>
              <span><strong>{a.title}</strong><br /><span className="small muted">{a.detail}</span></span>
              <span className="sr-only">{a.earned ? 'earned' : 'not yet earned'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
