import { useMemo } from 'react'
import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { stages } from '../lib/goals'
import { groupStats, isDue, isWeak, mastery } from '../lib/progress'
import { balanced, buildExam, weighted } from '../lib/select'
import { startExam, startPractice } from '../lib/session'
import { href, navigate } from '../lib/router'
import { Bar } from '../components/ui'

export default function FullMarks() {
  const { questions, byId, handbook } = useData()
  const s = useStore((x) => x)
  const sectionIds = useMemo(() => {
    const ids = new Set(questions.flatMap((q) => q.topics.map((t) => t.id)))
    return (handbook?.sections ?? []).filter((x) => ids.has(x.id)).map((x) => x.id)
  }, [questions, handbook])
  const st = stages(questions, s, sectionIds)
  const current = st.find((x) => !x.done) ?? st[st.length - 1]

  const action = (n: number) => {
    const p = s.progress
    if (n === 1) {
      const nextId = sectionIds.find((id) => !s.learnViewed[id])
      return navigate(nextId ? `/learn/${nextId}` : '/learn')
    }
    if (n === 2) {
      // Least-covered category first, unseen questions from it.
      const g = groupStats(questions, p, (q) => [q.category]).sort((a, b) => a.coverage - b.coverage)[0]
      const pool = questions.filter((q) => q.category === g.key)
      const unseen = pool.filter((q) => !p[q.id]?.attempts)
      return startPractice(`Stage 2 · ${g.key}`, weighted(unseen.length ? unseen : pool, 20, p))
    }
    if (n === 3) {
      const weak = questions.filter((q) => isWeak(p[q.id]))
      return startPractice('Stage 3 · Weak areas', weighted(weak.length ? weak : questions, 20, p))
    }
    if (n === 4) {
      const due = questions.filter((q) => isDue(p[q.id]) || mastery(p[q.id]) !== 'mastered')
      return startPractice('Stage 4 · Mixed questions', balanced(due.length >= 30 ? due : questions, 30))
    }
    const e = buildExam(questions, s.settings.exam)
    startExam(n === 6 ? 'Final readiness check' : 'Stage 5 · Mock DKT', e.ids.map((id) => byId.get(id)!), e.partOf, s.settings.exam)
  }

  const ready = st[5].done
  return (
    <div className="stack">
      <header>
        <h1>Full Marks Training</h1>
        <p className="muted">A plan that keeps testing you until you've shown strong results across the whole question bank. Each stage is measured from your actual answers.</p>
      </header>
      <section className={`card ${ready ? 'ready' : ''}`} role="status">
        {ready ? (
          <p><strong>✓ You have met all of your configured readiness criteria.</strong> That's strong evidence you're well prepared — but no app can guarantee a perfect score. Keep doing a daily review until your test.</p>
        ) : (
          <p><strong>Next step: Stage {current.n} — {current.title}.</strong> {current.goal}.</p>
        )}
        <p className="small muted">Mastered means correct 3+ times in a row, on at least 3 different days. <a href={href('/settings')}>Readiness criteria</a> are adjustable.</p>
      </section>
      <ol className="stages">
        {st.map((x) => (
          <li key={x.n} className={`card stage ${x.done ? 'done' : ''} ${x === current && !ready ? 'current' : ''}`}>
            <div className="row between gap wrap">
              <div>
                <p className="eyebrow">Stage {x.n} {x.done ? '· ✓ Complete' : x === current ? '· In progress' : ''}</p>
                <h2 className="h3">{x.title}</h2>
                <p>{x.goal}</p>
                <p className="small muted">{x.detail}</p>
              </div>
              <button className={`btn ${x === current ? 'primary' : ''}`} onClick={() => action(x.n)}>
                {x.n === 1 ? 'Open Learn' : x.n >= 5 ? 'Start test' : 'Start'}
              </button>
            </div>
            <Bar value={x.progress} tone={x.done ? 'good' : undefined} label={`Stage ${x.n} progress`} />
          </li>
        ))}
      </ol>
    </div>
  )
}
