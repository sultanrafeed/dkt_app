import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Question } from '../lib/types'
import { useData } from '../lib/data'
import { href } from '../lib/router'
import { getState, setState, useStore } from '../lib/store'
import { MASTERY_ICON, MASTERY_LABEL, mastery, toggleBookmark, toggleFlag } from '../lib/progress'

export function Bar({ value, label, tone }: { value: number; label?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <span className={tone ? `tone-${tone}` : ''} style={{ width: `${v * 100}%` }} />
    </div>
  )
}

export const toneFor = (acc: number, has = true) => (!has ? undefined : acc >= 0.9 ? 'good' : acc >= 0.75 ? 'warn' : 'bad')

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} onClose={onClose} aria-label={title}
      onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="dialog-body">{open && children}</div>
    </dialog>
  )
}

/** Question picture; tap/click to open it full size. */
export function QImage({ q }: { q: Question }) {
  const [zoom, setZoom] = useState(false)
  if (!q.image) return null
  return (
    <>
      <button className="qimage" onClick={() => setZoom(true)} aria-label="Enlarge picture">
        <img src={`./${q.image.src}`} width={q.image.width} height={q.image.height} alt={q.image.alt} />
        <span className="zoom-hint" aria-hidden>⤢ Enlarge</span>
      </button>
      <Dialog open={zoom} onClose={() => setZoom(false)} title={`Picture – ${q.code}`} wide>
        <div className="zoomed">
          <img src={`./${q.image.src}`} alt={q.image.alt} />
        </div>
      </Dialog>
    </>
  )
}

export function MasteryBadge({ id }: { id: string }) {
  const p = useStore((s) => s.progress[id])
  const m = mastery(p)
  return (
    <span className={`badge m-${m}`} title={MASTERY_LABEL[m]}>
      <span aria-hidden>{MASTERY_ICON[m]}</span> {MASTERY_LABEL[m]}
    </span>
  )
}

export function History({ id }: { id: string }) {
  const h = useStore((s) => s.progress[id]?.history)
  if (!h?.length) return <span className="muted small">No attempts</span>
  return (
    <span className="history" aria-label={`Last ${Math.min(h.length, 6)} results: ${h.slice(-6).map((x) => (x ? 'correct' : 'wrong')).join(', ')}`}>
      {h.slice(-6).map((x, i) => (
        <span key={i} className={x ? 'dot ok' : 'dot no'} aria-hidden>{x ? '✓' : '✗'}</span>
      ))}
    </span>
  )
}

export function BookmarkButton({ id, compact }: { id: string; compact?: boolean }) {
  const on = useStore((s) => !!s.progress[id]?.bookmarked)
  return (
    <button className={`btn ghost toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleBookmark(id)} title="Bookmark (B)">
      <span aria-hidden>{on ? '★' : '☆'}</span>{!compact && (on ? ' Bookmarked' : ' Bookmark')}
    </button>
  )
}

export function FlagButton({ id, compact }: { id: string; compact?: boolean }) {
  const on = useStore((s) => !!s.progress[id]?.flagged)
  return (
    <button className={`btn ghost toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleFlag(id)} title="Mark for review (F)">
      <span aria-hidden>⚑</span>{!compact && (on ? ' Marked for review' : ' Mark for review')}
    </button>
  )
}

/** Source line + links into the handbook for a question. */
export function SourceRefs({ q }: { q: Question }) {
  const [page, setPage] = useState<number | null>(null)
  return (
    <div className="refs">
      <p className="small">
        <strong>Source:</strong> Driver Knowledge Test Questions (Class C) — {q.code}, page {q.source.page}. Official answer = the option printed in bold in that document.
      </p>
      {q.topics.length > 0 && (
        <p className="small">
          <strong>Read in the Road User Handbook:</strong>{' '}
          {q.topics.map((t, i) => (
            <span key={t.id}>
              {i > 0 && ' · '}
              <a href={href(`/learn/${t.id}`)}>{t.title}</a>{' '}
              <button className="linklike" onClick={() => setPage(t.startPage)}>
                (p. {t.startPage}{t.endPage !== t.startPage ? `–${t.endPage}` : ''})
              </button>
            </span>
          ))}
          <span className="muted"> — links matched automatically by topic</span>
        </p>
      )}
      {q.review && (
        <p className="review-note small" role="note">
          <strong>⚠ Check this one:</strong> {q.review.note}
        </p>
      )}
      <PageViewer page={page} onClose={() => setPage(null)} />
    </div>
  )
}

/** Shows a handbook page (scan + extracted text) with next/previous. */
export function PageViewer({ page, onClose }: { page: number | null; onClose: () => void }) {
  const { handbook } = useData()
  const [p, setP] = useState(page)
  useEffect(() => setP(page), [page])
  if (!handbook) return null
  const off = handbook.pageOffset
  const hp = p !== null ? handbook.pages[p + off - 1] : null
  return (
    <Dialog open={p !== null} onClose={onClose} title={hp ? `Road User Handbook – page ${hp.page}` : 'Handbook'} wide>
      {hp && (
        <div className="pageview">
          <div className="row gap">
            <button className="btn" disabled={p! <= 1} onClick={() => setP(p! - 1)}>← Previous page</button>
            <button className="btn" disabled={p! + off >= handbook.pages.length} onClick={() => setP(p! + 1)}>Next page →</button>
          </div>
          <img className="pagescan" src={`./${hp.image}`} alt={`Scan of Road User Handbook page ${hp.page}`} loading="lazy" />
        </div>
      )}
    </Dialog>
  )
}

export function ReportButton({ q }: { q: Question }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const save = () => {
    setState((s) => ({ ...s, reports: [...s.reports, { id: `${Date.now()}`, questionId: q.id, text, at: Date.now() }] }))
    setSent(true)
    setText('')
  }
  return (
    <>
      <button className="btn ghost" onClick={() => { setOpen(true); setSent(false) }}>⚐ Report issue</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Report a possible data issue – ${q.code}`}>
        {sent ? (
          <>
            <p>Saved on this device. You can export all reports from <a href={href('/settings')} onClick={() => setOpen(false)}>Settings</a>.</p>
            <button className="btn primary" onClick={() => setOpen(false)}>Close</button>
          </>
        ) : (
          <>
            <p className="small muted">Describe what looks wrong (text, answer, picture). Compare with page {q.source.page} of the question PDF. Reports stay on this device ({getState().reports.length} saved so far).</p>
            <label className="field">
              <span>What looks wrong?</span>
              <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button className="btn primary" disabled={!text.trim()} onClick={save}>Save report</button>
          </>
        )}
      </Dialog>
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
