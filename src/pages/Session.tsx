import { useEffect, useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useStore } from '../lib/store'
import { answerPractice, abandonActive, finishActive, retryQuestion, updateActive } from '../lib/session'
import { recordAnswers, toggleBookmark, toggleFlag } from '../lib/progress'
import { navigate, href } from '../lib/router'
import { QuestionCard } from '../components/QuestionCard'
import { Bar, BookmarkButton, Dialog, FlagButton, ReportButton, SourceRefs, Empty } from '../components/ui'

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Session() {
  const { byId } = useData()
  const a = useStore((s) => s.active)
  const [confirm, setConfirm] = useState(false)
  const [showRefs, setShowRefs] = useState(true)
  const [showNav, setShowNav] = useState(false)
  const [now, setNow] = useState(Date.now())
  const isExam = a?.kind === 'exam'
  const immediate = a?.revealMode === 'immediate' && !isExam

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const q = a ? byId.get(a.ids[a.idx]) : undefined
  const limitMs = isExam && a?.exam?.timeLimit ? a.exam.timeLimit * 60000 : 0
  const elapsed = a ? now - a.startedAt : 0
  const remaining = limitMs ? limitMs - elapsed : 0

  useEffect(() => {
    if (limitMs && remaining <= 0 && a) finishActive(byId)
  }, [limitMs, remaining, a, byId])

  const counts = useMemo(() => {
    if (!a) return { answered: 0, flagged: 0, unanswered: 0 }
    const answered = a.ids.filter((id) => a.answers[id] !== undefined).length
    return { answered, flagged: a.ids.filter((id) => a.flagged[id]).length, unanswered: a.ids.length - answered }
  }, [a])

  const go = (i: number) => a && updateActive((x) => ({ ...x, idx: Math.max(0, Math.min(x.ids.length - 1, i)) }))
  const next = () => {
    if (!a) return
    if (a.idx < a.ids.length - 1) go(a.idx + 1)
    else setConfirm(true)
  }
  const skip = () => {
    if (!a || !q) return
    updateActive((x) => ({ ...x, skipped: { ...x.skipped, [q.id]: true } }))
    next()
  }
  const choose = (orig: number) => {
    if (!a || !q) return
    if (immediate) {
      if (a.revealed[q.id]) return
      answerPractice(q, orig)
    } else {
      updateActive((x) => ({ ...x, answers: { ...x.answers, [q.id]: orig }, skipped: { ...x.skipped, [q.id]: false } }))
    }
  }
  const showAnswer = () => {
    if (!a || !q || a.revealed[q.id]) return
    if (!a.recorded[q.id]) recordAnswers([{ id: q.id, ok: false }])
    updateActive((x) => ({ ...x, revealed: { ...x.revealed, [q.id]: true }, recorded: { ...x.recorded, [q.id]: true } }))
  }
  const flagInSession = () => q && updateActive((x) => ({ ...x, flagged: { ...x.flagged, [q.id]: !x.flagged[q.id] } }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!a || !q || confirm) return
      const t = e.target as HTMLElement
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || document.querySelector('dialog[open]')) return
      const k = e.key.toLowerCase()
      const n = ['1', '2', '3', '4'].indexOf(k)
      if (n >= 0 && n < q.options.length) { choose(a.order[q.id][n]); e.preventDefault() }
      else if (k === 'arrowright' || k === 'enter') { if (!(immediate && a.answers[q.id] === undefined && k === 'enter')) next() }
      else if (k === 'arrowleft') go(a.idx - 1)
      else if (k === 'b' && !isExam) toggleBookmark(q.id)
      else if (k === 'f') (isExam ? flagInSession() : toggleFlag(q.id))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!a || !q) {
    return (
      <Empty>
        <h1>No session in progress</h1>
        <p>Start one from <a href={href('/practice')}>Practice</a> or <a href={href('/mock')}>Mock Test</a>.</p>
      </Empty>
    )
  }

  const chosen = a.answers[q.id]
  const revealed = immediate && !!a.revealed[q.id]
  const ok = chosen === q.correctIndex
  const last = a.idx === a.ids.length - 1

  return (
    <div className={`session ${isExam ? 'exam-mode' : ''}`}>
      <header className="session-head">
        <div className="row between wrap gap">
          <div>
            <p className="eyebrow">{isExam ? 'Mock test' : 'Practice'}</p>
            <h1 className="h3">{a.title}</h1>
          </div>
          <div className="row gap wrap">
            {(!isExam || a.exam?.showTimer !== false) && (
              <span className={`timer ${limitMs && remaining < 60000 ? 'urgent' : ''}`} aria-live="off" title={limitMs ? 'Time remaining' : 'Time elapsed'}>
                ⏱ {limitMs ? fmt(remaining) : fmt(elapsed)}
              </span>
            )}
            <button className="btn" onClick={() => setShowNav((v) => !v)} aria-expanded={showNav}>▦ Questions</button>
            <button className="btn primary" onClick={() => setConfirm(true)}>{isExam ? 'Submit test' : 'Finish'}</button>
          </div>
        </div>
        <div className="row between small muted">
          <span aria-live="polite">Question {a.idx + 1} of {a.ids.length}</span>
          <span>{counts.answered} answered{isExam ? ` · ${counts.flagged} flagged` : ''}</span>
        </div>
        <Bar value={(a.idx + 1) / a.ids.length} label="Position in session" />
        {showNav && (
          <nav className="qnav" aria-label="Jump to question">
            {a.ids.map((id, i) => {
              const st = a.answers[id] !== undefined ? (immediate && a.revealed[id] ? (a.answers[id] === byId.get(id)!.correctIndex ? 'ok' : 'no') : 'done') : a.skipped[id] ? 'skip' : ''
              return (
                <button key={id} className={`qnav-btn ${st} ${i === a.idx ? 'cur' : ''} ${a.flagged[id] ? 'flag' : ''}`}
                  onClick={() => { go(i); setShowNav(false) }}
                  aria-label={`Question ${i + 1}${a.answers[id] !== undefined ? ', answered' : ', not answered'}${a.flagged[id] ? ', flagged' : ''}`}
                  aria-current={i === a.idx}>
                  {i + 1}{a.flagged[id] ? '⚑' : ''}
                </button>
              )
            })}
          </nav>
        )}
      </header>

      <QuestionCard key={q.id} q={q} order={a.order[q.id]} chosen={chosen} reveal={revealed} onChoose={choose} locked={revealed}
        number={isExam && a.partOf && a.exam ? a.exam.parts[a.partOf[q.id]]?.label : undefined} />

      {revealed && (
        <section className={`feedback ${ok ? 'good' : 'bad'}`} aria-live="assertive">
          <p className="feedback-title">{ok ? '✓ Correct' : chosen === undefined ? 'Answer shown' : '✗ Not correct'}</p>
          {!ok && (
            <p>
              {chosen !== undefined && <>Your answer: <strong>{q.options[chosen]}</strong><br /></>}
              Official answer: <strong>{q.options[q.correctIndex]}</strong>
            </p>
          )}
          <div className="row gap wrap">
            <button className="btn" onClick={() => setShowRefs((v) => !v)} aria-expanded={showRefs}>{showRefs ? 'Hide references' : 'Show references'}</button>
            {!ok && <button className="btn" onClick={() => retryQuestion(q.id)}>↺ Try again</button>}
          </div>
          {showRefs && <SourceRefs q={q} />}
        </section>
      )}

      <div className="session-tools row gap wrap">
        {isExam ? (
          <button className={`btn ghost toggle ${a.flagged[q.id] ? 'on' : ''}`} aria-pressed={!!a.flagged[q.id]} onClick={flagInSession}>⚑ {a.flagged[q.id] ? 'Flagged' : 'Flag to come back'}</button>
        ) : (
          <>
            <BookmarkButton id={q.id} />
            <FlagButton id={q.id} />
            <ReportButton q={q} />
            {immediate && !revealed && <button className="btn ghost" onClick={showAnswer}>Show answer</button>}
          </>
        )}
      </div>

      <div className="session-nav">
        <button className="btn" onClick={() => go(a.idx - 1)} disabled={a.idx === 0}>← Previous</button>
        {!(immediate && revealed) && chosen === undefined && <button className="btn" onClick={skip}>Skip</button>}
        <button className="btn primary" onClick={next}>{last ? (isExam ? 'Review & submit' : 'Finish') : 'Next →'}</button>
      </div>
      <p className="small muted center kbd-hint">Keys: 1–3 choose · ← → move · {isExam ? 'F flag' : 'B bookmark · F mark for review'}</p>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={isExam ? 'Submit your test?' : 'Finish this session?'}>
        {counts.unanswered > 0 ? (
          <p className="warn-box" role="alert">⚠ You have <strong>{counts.unanswered}</strong> unanswered question{counts.unanswered === 1 ? '' : 's'}. {isExam ? 'Unanswered questions are marked wrong.' : 'They will be left out of your progress.'}</p>
        ) : (
          <p>All {a.ids.length} questions answered.</p>
        )}
        {isExam && counts.flagged > 0 && <p>{counts.flagged} question{counts.flagged === 1 ? ' is' : 's are'} flagged for review.</p>}
        <div className="row gap wrap">
          {counts.unanswered > 0 && (
            <button className="btn" onClick={() => { setConfirm(false); const i = a.ids.findIndex((id) => a.answers[id] === undefined); go(i) }}>Go to first unanswered</button>
          )}
          <button className="btn primary" onClick={() => { setConfirm(false); finishActive(byId) }}>{isExam ? 'Submit test' : 'Finish'}</button>
          <button className="btn ghost" onClick={() => { setConfirm(false); abandonActive(); navigate('/') }}>Discard session</button>
        </div>
      </Dialog>
    </div>
  )
}
