import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { groupStats, markLearnViewed, pct } from '../lib/progress'
import { weighted } from '../lib/select'
import { startPractice } from '../lib/session'
import { href } from '../lib/router'
import { Bar, Empty, PageViewer, toneFor } from '../components/ui'
import type { HandbookBlock } from '../lib/types'

function Rich({ text }: { text: string }) {
  // The handbook marks key terms in bold; keep that emphasis.
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}</>
}

export function Blocks({ blocks }: { blocks: HandbookBlock[] }) {
  const out: ReactElement[] = []
  let list: HandbookBlock[] = []
  const flush = (k: number) => {
    if (!list.length) return
    const ordered = list[0].type === 'ol'
    const items = list.map((b, i) => <li key={i}><Rich text={b.text} /></li>)
    out.push(ordered ? <ol key={`l${k}`}>{items}</ol> : <ul key={`l${k}`}>{items}</ul>)
    list = []
  }
  blocks.forEach((b, i) => {
    if (b.type === 'li' || b.type === 'ol') {
      if (list.length && list[0].type !== b.type) flush(i)
      list.push(b)
      return
    }
    flush(i)
    if (b.type === 'h1' || b.type === 'h2') return
    if (b.type === 'h3') out.push(<h3 key={i}>{b.text}</h3>)
    else if (b.type === 'h4') out.push(<h4 key={i}>{b.text}</h4>)
    else if (b.type === 'note') out.push(<p key={i} className="hb-note">{b.text}</p>)
    else out.push(<p key={i}><Rich text={b.text} /></p>)
  })
  flush(blocks.length)
  return <>{out}</>
}

export function LearnIndex() {
  const { handbook, questions } = useData()
  const progress = useStore((s) => s.progress)
  const viewed = useStore((s) => s.learnViewed)
  const stats = useMemo(() => new Map(groupStats(questions, progress, (q) => q.topics.map((t) => t.id)).map((g) => [g.key, g])), [questions, progress])
  if (!handbook) return <Empty>Loading handbook…</Empty>
  const parts = [...new Set(handbook.sections.map((s) => s.part))]
  return (
    <div className="stack">
      <header>
        <h1>Learn</h1>
        <p className="muted">The NSW Road User Handbook (February 2026), organised the way the handbook is. Sections with DKT questions show how many, and how you're doing on them.</p>
      </header>
      {parts.map((part) => (
        <section key={part} className="card">
          <h2 className="h3">{part}</h2>
          <ul className="topic-list">
            {handbook.sections.filter((s) => s.part === part).map((s) => {
              const g = stats.get(s.id)
              return (
                <li key={s.id}>
                  <a href={href(`/learn/${s.id}`)} className="topic-row">
                    <span className="topic-title">{viewed[s.id] ? <span className="read" aria-label="read">✓ </span> : null}{s.title}</span>
                    <span className="small muted">p. {s.startPage}{s.endPage !== s.startPage ? `–${s.endPage}` : ''}</span>
                    {g ? (
                      <span className="topic-stat">
                        <span className="small">{g.total} Q · {g.attempted ? pct(g.accuracy) : 'not started'}</span>
                        <Bar value={g.coverage} tone={toneFor(g.accuracy, g.attempted > 0)} label={`${s.title} coverage`} />
                      </span>
                    ) : <span className="small muted">no DKT questions</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function LearnSection({ id }: { id: string }) {
  const { handbook, questions } = useData()
  const progress = useStore((s) => s.progress)
  const [page, setPage] = useState<number | null>(null)
  const sec = handbook?.sections.find((s) => s.id === id)
  useEffect(() => { if (sec) markLearnViewed(sec.id) }, [sec])
  if (!handbook) return <Empty>Loading handbook…</Empty>
  if (!sec) return <Empty><h1>Section not found</h1><a href={href('/learn')}>Back to Learn</a></Empty>
  const idx = handbook.sections.indexOf(sec)
  const prev = handbook.sections[idx - 1]
  const next = handbook.sections[idx + 1]
  const pages = handbook.pages.slice(sec.startPdfPage - 1, sec.endPdfPage)
  // Keep only this section's text: start at its heading, stop at the next section heading.
  const blocks: { page: number; b: HandbookBlock[] }[] = []
  let on = false
  let done = false
  for (const p of pages) {
    const bs: HandbookBlock[] = []
    for (const b of p.blocks) {
      if (done) break
      if (b.type === 'h2') {
        if (b.text === sec.title) { on = true; continue }
        if (on) { done = true; break }
      }
      if (on) bs.push(b)
    }
    if (bs.length) blocks.push({ page: p.page!, b: bs })
  }
  const related = questions.filter((q) => q.topics.some((t) => t.id === id))

  return (
    <div className="stack">
      <nav className="small"><a href={href('/learn')}>Learn</a> › {sec.part}</nav>
      <header>
        <h1>{sec.title}</h1>
        <p className="muted small">Road User Handbook, pages {sec.startPage}–{sec.endPage}. Text extracted from the PDF; diagrams and signs are on the page scans.</p>
        <div className="row gap wrap">
          {related.length > 0 && (
            <button className="btn primary" onClick={() => startPractice(`Topic: ${sec.title}`, weighted(related, related.length, progress))}>
              Practise {related.length} question{related.length === 1 ? '' : 's'} on this topic
            </button>
          )}
          <button className="btn" onClick={() => setPage(sec.startPage)}>View original pages</button>
        </div>
      </header>
      <article className="card handbook">
        {blocks.map(({ page, b }) => (
          <section key={page} className="hb-page">
            <p className="hb-pageno"><button className="linklike small" onClick={() => setPage(page)}>Page {page} — view scan with diagrams</button></p>
            <Blocks blocks={b} />
          </section>
        ))}
        {!blocks.length && <p className="muted">This section is mainly pictures. <button className="linklike" onClick={() => setPage(sec.startPage)}>View the page scan</button>.</p>}
      </article>
      {related.length > 0 && (
        <section className="card">
          <h2 className="h3">DKT questions linked to this topic</h2>
          <ul className="plain qlinks">
            {related.map((q) => <li key={q.id}><a href={href(`/q/${q.id}`)}><span className="code">{q.code}</span> {q.question}</a>{q.image && <span aria-label="has picture"> 🖼</span>}</li>)}
          </ul>
        </section>
      )}
      <nav className="row between gap wrap">
        {prev ? <a className="btn" href={href(`/learn/${prev.id}`)}>← {prev.title}</a> : <span />}
        {next ? <a className="btn" href={href(`/learn/${next.id}`)}>{next.title} →</a> : <span />}
      </nav>
      <PageViewer page={page} onClose={() => setPage(null)} />
    </div>
  )
}
