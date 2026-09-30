import { useMemo, useState } from 'react'
import { useData, norm } from '../lib/data'
import { useStore } from '../lib/store'
import { accuracy, isWeak, mastery, pct } from '../lib/progress'
import { startPractice } from '../lib/session'
import { href } from '../lib/router'
import { BookmarkButton, FlagButton, History, MasteryBadge, QImage, ReportButton, SourceRefs, Empty } from '../components/ui'

type Filter = 'all' | 'incorrect' | 'unanswered' | 'bookmarked' | 'flagged' | 'images' | 'mastered' | 'weak' | 'review'

export function Bank({ query }: { query: URLSearchParams }) {
  const { questions } = useData()
  const progress = useStore((s) => s.progress)
  const [text, setText] = useState(query.get('q') ?? '')
  const [cat, setCat] = useState(query.get('cat') ?? '')
  const [filter, setFilter] = useState<Filter>((query.get('f') as Filter) || 'all')
  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions])

  const list = useMemo(() => {
    const t = norm(text.trim())
    return questions.filter((q) => {
      const p = progress[q.id]
      const ok: Record<Filter, boolean> = {
        all: true,
        incorrect: (p?.incorrect ?? 0) > 0,
        unanswered: !p?.attempts,
        bookmarked: !!p?.bookmarked,
        flagged: !!p?.flagged,
        images: !!q.image,
        mastered: mastery(p) === 'mastered',
        weak: isWeak(p),
        review: !!q.review,
      }
      if (!ok[filter] || (cat && q.category !== cat)) return false
      if (!t) return true
      const hay = norm([q.code, q.category, q.section, q.question, ...q.options, ...q.topics.map((x) => x.title)].join(' '))
      return t.split(' ').every((w) => hay.includes(w))
    })
  }, [questions, progress, text, cat, filter])

  return (
    <div className="stack">
      <header>
        <h1>Question Bank</h1>
        <p className="muted">All {questions.length} questions from the source document. Filter, search and open any question.</p>
      </header>
      <div className="filters card">
        <label className="field">
          <span>Search</span>
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. roundabout, 40 km/h, SI013" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Category</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Show</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All</option>
              <option value="unanswered">Unanswered</option>
              <option value="incorrect">Answered incorrectly (ever)</option>
              <option value="weak">Weak</option>
              <option value="mastered">Mastered</option>
              <option value="bookmarked">Bookmarked</option>
              <option value="flagged">Marked for review</option>
              <option value="images">With pictures</option>
              <option value="review">Source needs checking</option>
            </select>
          </label>
        </div>
        <div className="row between wrap gap">
          <span className="small muted" aria-live="polite">{list.length} question{list.length === 1 ? '' : 's'}</span>
          {list.length > 0 && <button className="btn" onClick={() => startPractice(`Question Bank selection (${list.length})`, list)}>Practise these</button>}
        </div>
      </div>
      {list.length ? (
        <ul className="bank-list">
          {list.map((q) => {
            const p = progress[q.id]
            return (
              <li key={q.id}>
                <a className="bank-row" href={href(`/q/${q.id}`)}>
                  <span className="bank-top">
                    <span className="code">{q.code}</span>
                    <span className="chip">{q.category}</span>
                    {q.image && <span className="small" title="Has a picture">🖼 picture</span>}
                    {p?.bookmarked && <span title="Bookmarked">★</span>}
                    {q.review && <span className="small" title="Source needs checking">⚠</span>}
                  </span>
                  <span className="bank-q">{q.question}</span>
                  <span className="bank-bottom">
                    <MasteryBadge id={q.id} />
                    <History id={q.id} />
                    {p?.attempts ? <span className="small muted">{pct(accuracy(p))} of {p.attempts}</span> : null}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      ) : <Empty>No questions match.</Empty>}
    </div>
  )
}

export function QuestionDetail({ id }: { id: string }) {
  const { byId } = useData()
  const p = useStore((s) => s.progress[id])
  const q = byId.get(id)
  if (!q) return <Empty><h1>Question not found</h1><a href={href('/bank')}>Question Bank</a></Empty>
  return (
    <div className="stack">
      <nav className="small"><a href={href('/bank')}>Question Bank</a> › {q.code}</nav>
      <article className="card">
        <div className="qmeta"><span className="code">{q.code}</span><span className="chip">{q.category}</span><span className="chip">{q.section}</span><MasteryBadge id={q.id} /></div>
        <h1 className="qtext">{q.question}</h1>
        <QImage q={q} />
        <ol className="answer-list">
          {q.options.map((o, i) => (
            <li key={i} className={i === q.correctIndex ? 'right-line' : ''}>
              {i === q.correctIndex ? <><strong>{o}</strong> <span className="opttag">✓ Official answer</span></> : o}
            </li>
          ))}
        </ol>
        <SourceRefs q={q} />
        <p className="small">Your history: <History id={q.id} /> {p?.attempts ? `· ${p.correct}/${p.attempts} correct · last ${new Date(p.lastAttempted!).toLocaleDateString()}` : ''}</p>
        <div className="row gap wrap">
          <button className="btn primary" onClick={() => startPractice(`Question ${q.code}`, [q], { revealMode: 'immediate' })}>Practise this question</button>
          <BookmarkButton id={q.id} />
          <FlagButton id={q.id} />
          <ReportButton q={q} />
        </div>
      </article>
    </div>
  )
}
