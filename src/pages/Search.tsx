import { useMemo, useState } from 'react'
import { useData, norm } from '../lib/data'
import { href, navigate } from '../lib/router'
import { startPractice } from '../lib/session'
import { MasteryBadge } from '../components/ui'

function highlight(text: string, words: string[]) {
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(re).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))
}

export default function Search({ query }: { query: URLSearchParams }) {
  const { questions, handbook } = useData()
  const [text, setText] = useState(query.get('q') ?? '')
  const t = norm(text.trim())
  const words = t ? t.split(' ') : []
  const displayWords = text.trim() ? text.trim().split(/\s+/) : []

  const qHits = useMemo(() => {
    if (!words.length) return []
    return questions.filter((q) => {
      const hay = norm([q.code, q.category, q.section, q.question, ...q.options, ...q.topics.map((x) => x.title)].join(' '))
      return words.every((w) => hay.includes(w))
    })
  }, [questions, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const hbHits = useMemo(() => {
    if (!words.length || !handbook) return []
    const out: { page: number; section: string; sectionId?: string; text: string }[] = []
    for (const p of handbook.pages) {
      if (!p.page || p.page > 200) continue
      for (const b of p.blocks) {
        const txt = b.text.replace(/\*\*/g, '')
        const hay = norm(txt + ' ' + (p.section ?? ''))
        if (words.every((w) => hay.includes(w))) {
          out.push({ page: p.page, section: p.section ?? '', sectionId: handbook.sections.find((s) => s.title === p.section)?.id, text: txt })
        }
      }
    }
    return out.slice(0, 60)
  }, [handbook, t]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <header>
        <h1>Search</h1>
        <p className="muted">Searches question text, answers, codes, categories, handbook topics and the full handbook text.</p>
      </header>
      <form className="card" onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(text)}`) }} role="search">
        <label className="field">
          <span>Search for</span>
          <input type="search" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="roundabout · 40 km/h · SI013 · clearway · seatbelt" />
        </label>
      </form>
      {words.length > 0 && (
        <>
          <section className="stack">
            <div className="row between wrap gap">
              <h2 className="h3">Questions ({qHits.length})</h2>
              {qHits.length > 0 && <button className="btn" onClick={() => startPractice(`Search: ${text}`, qHits)}>Practise these</button>}
            </div>
            <ul className="bank-list">
              {qHits.map((q) => (
                <li key={q.id}>
                  <a className="bank-row" href={href(`/q/${q.id}`)}>
                    <span className="bank-top"><span className="code">{q.code}</span><span className="chip">{q.category}</span>{q.image && <span className="small">🖼 picture</span>}</span>
                    <span className="bank-q">{highlight(q.question, displayWords)}</span>
                    <span className="small muted">Official answer: {highlight(q.options[q.correctIndex], displayWords)}</span>
                    <span className="bank-bottom"><MasteryBadge id={q.id} /></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="stack">
            <h2 className="h3">Road User Handbook ({hbHits.length}{hbHits.length === 60 ? '+' : ''})</h2>
            <ul className="plain hb-hits">
              {hbHits.map((h, i) => (
                <li key={i} className="card">
                  <p className="small muted">Page {h.page} · {h.sectionId ? <a href={href(`/learn/${h.sectionId}`)}>{h.section}</a> : h.section}</p>
                  <p>{highlight(h.text, displayWords)}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
