import type { ActiveSession, ExamConfig, Question, SessionRecord } from './types'
import { getState, setState } from './store'
import { optionOrder } from './select'
import { recordAnswers, saveSession } from './progress'
import { navigate } from './router'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function startPractice(title: string, qs: Question[], opts?: { revealMode?: 'immediate' | 'end' }) {
  if (!qs.length) return
  const s = getState().settings
  const active: ActiveSession = {
    id: uid(),
    kind: 'practice',
    title,
    ids: qs.map((q) => q.id),
    order: Object.fromEntries(qs.map((q) => [q.id, optionOrder(q, s.shuffleOptions)])),
    idx: 0,
    answers: {},
    recorded: {},
    revealed: {},
    flagged: {},
    skipped: {},
    startedAt: Date.now(),
    revealMode: opts?.revealMode ?? s.revealMode,
  }
  setState((st) => ({ ...st, active }))
  navigate('/session')
}

export function startExam(title: string, qs: Question[], partOf: Record<string, number>, exam: ExamConfig) {
  const s = getState().settings
  const active: ActiveSession = {
    id: uid(),
    kind: 'exam',
    title,
    ids: qs.map((q) => q.id),
    order: Object.fromEntries(qs.map((q) => [q.id, optionOrder(q, s.shuffleOptions)])),
    idx: 0,
    answers: {},
    recorded: {},
    revealed: {},
    flagged: {},
    skipped: {},
    startedAt: Date.now(),
    revealMode: 'end',
    exam,
    partOf,
  }
  setState((st) => ({ ...st, active }))
  navigate('/session')
}

export function updateActive(fn: (a: ActiveSession) => ActiveSession) {
  setState((st) => (st.active ? { ...st, active: fn(st.active) } : st))
}

/** Practice with immediate feedback: store the first answer to each question. */
export function answerPractice(q: Question, chosen: number) {
  const a = getState().active
  if (!a) return
  const first = !a.recorded[q.id]
  updateActive((x) => ({
    ...x,
    answers: { ...x.answers, [q.id]: chosen },
    revealed: x.revealMode === 'immediate' ? { ...x.revealed, [q.id]: true } : x.revealed,
    recorded: x.revealMode === 'immediate' ? { ...x.recorded, [q.id]: true } : x.recorded,
    skipped: { ...x.skipped, [q.id]: false },
  }))
  if (first && a.revealMode === 'immediate') recordAnswers([{ id: q.id, ok: chosen === q.correctIndex }])
}

/** Let the learner try a question again (retries never change the recorded result). */
export function retryQuestion(id: string) {
  updateActive((x) => {
    const answers = { ...x.answers }
    delete answers[id]
    return { ...x, answers, revealed: { ...x.revealed, [id]: false } }
  })
}

/** Finish the active session, write results to progress and history. */
export function finishActive(byId: Map<string, Question>): SessionRecord | null {
  const a = getState().active
  if (!a) return null
  const unrecorded = a.ids.filter((id) => !a.recorded[id] && a.answers[id] !== undefined)
  recordAnswers(unrecorded.map((id) => ({ id, ok: a.answers[id] === byId.get(id)!.correctIndex })))
  const answers = a.ids.map((id) => {
    const chosen = a.answers[id] ?? null
    return { id, chosen, correct: chosen !== null && chosen === byId.get(id)!.correctIndex }
  })
  const rec: SessionRecord = {
    id: a.id,
    kind: a.kind,
    title: a.title,
    startedAt: a.startedAt,
    finishedAt: Date.now(),
    total: a.ids.length,
    correct: answers.filter((x) => x.correct).length,
    answers,
  }
  if (a.kind === 'exam' && a.exam && a.partOf) {
    rec.parts = a.exam.parts.map((p, pi) => {
      const inPart = answers.filter((x) => a.partOf![x.id] === pi)
      const correct = inPart.filter((x) => x.correct).length
      return { label: p.label, correct, total: inPart.length, passMark: p.passMark, passed: correct >= p.passMark }
    })
    rec.passed = rec.parts.every((p) => p.passed)
  }
  saveSession(rec)
  setState((st) => ({ ...st, active: null }))
  navigate(`/results/${rec.id}`)
  return rec
}

export function abandonActive() {
  setState((st) => ({ ...st, active: null }))
}
