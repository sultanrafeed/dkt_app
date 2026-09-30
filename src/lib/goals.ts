import type { Question } from './types'
import type { State } from './store'
import { groupStats, isWeak, overview, studyStreak } from './progress'

export interface Achievement {
  id: string
  title: string
  detail: string
  earned: boolean
}

export function achievements(qs: Question[], s: State): Achievement[] {
  const o = overview(qs, s)
  const cats = groupStats(qs, s.progress, (q) => [q.category])
  const perfectCat = cats.find((c) => c.coverage === 1 && c.accuracy === 1)
  const exams = s.sessions.filter((x) => x.kind === 'exam')
  const cleanSession = s.sessions.some((x) => x.total >= 10 && x.correct === x.total)
  const a = (id: string, title: string, detail: string, earned: boolean) => ({ id, title, detail, earned })
  return [
    a('q10', 'First 10', 'Answer 10 different questions', o.attempted >= 10),
    a('q50', '50 questions', 'Answer 50 different questions', o.attempted >= 50),
    a('q100', '100 questions', 'Answer 100 different questions', o.attempted >= 100),
    a('all', 'Whole bank', `Attempt all ${o.total} questions`, o.attempted === o.total),
    a('acc90', '90% accuracy', 'Overall accuracy of 90% or more (after 50+ answers)', o.answers >= 50 && o.accuracy >= 0.9),
    a('acc95', '95% accuracy', 'Overall accuracy of 95% or more (after 100+ answers)', o.answers >= 100 && o.accuracy >= 0.95),
    a('cat100', 'Category perfect', perfectCat ? `100% in ${perfectCat.key}` : 'Every question in a category attempted, all answers correct', !!perfectCat),
    a('mock1', 'Mock test done', 'Complete a mock test', exams.length > 0),
    a('mockpass', 'Mock test passed', 'Pass a mock test', exams.some((x) => x.passed)),
    a('clean', 'Mistake-free session', 'Finish a session of 10+ questions with no mistakes', cleanSession),
    a('run25', 'Run of 25', '25 correct answers in a row', s.run.best >= 25),
    a('days7', '7-day streak', 'Study on 7 days in a row', studyStreak(s.studyDays) >= 7),
    a('master50', '50 mastered', 'Master 50 questions', o.mastered >= 50),
    a('masterAll', 'All mastered', 'Master every question in the bank', o.mastered === o.total),
  ]
}

export interface Stage {
  n: number
  title: string
  goal: string
  progress: number
  done: boolean
  detail: string
}

/** The six Full Marks Training stages, each measured against real progress data. */
export function stages(qs: Question[], s: State, sectionIdsWithQuestions: string[]): Stage[] {
  const o = overview(qs, s)
  const r = s.settings.readiness
  const viewed = sectionIdsWithQuestions.filter((id) => s.learnViewed[id]).length
  const learnP = sectionIdsWithQuestions.length ? viewed / sectionIdsWithQuestions.length : 0
  const cats = groupStats(qs, s.progress, (q) => [q.category])
  const catMin = Math.min(...cats.map((c) => c.coverage))
  const weakNow = qs.filter((q) => isWeak(s.progress[q.id])).length
  const everWrong = qs.filter((q) => (s.progress[q.id]?.incorrect ?? 0) > 0).length
  const exams = s.sessions.filter((x) => x.kind === 'exam')
  let inARow = 0
  for (const e of exams) {
    if (!e.passed) break
    inARow++
  }
  const mixedOk = o.attempted === o.total && o.recentCount >= 50 && o.recentAccuracy >= 0.9
  const readyChecks = [
    o.attempted / o.total >= r.attemptedPct / 100,
    o.mastered / o.total >= r.masteredPct / 100,
    o.recentCount >= 50 && o.recentAccuracy >= r.recentAccuracyPct / 100,
    inARow >= r.mockPassesInARow,
  ]
  return [
    { n: 1, title: 'Learn', goal: 'Read every handbook section that has test questions', progress: learnP, done: learnP >= 1, detail: `${viewed} of ${sectionIdsWithQuestions.length} sections read` },
    { n: 2, title: 'Practice by topic', goal: 'Attempt at least 80% of every question category', progress: Math.min(1, catMin / 0.8), done: catMin >= 0.8, detail: `Lowest category coverage: ${Math.round(catMin * 100)}%` },
    { n: 3, title: 'Weak areas', goal: 'Clear every question you currently get wrong', progress: everWrong ? 1 - weakNow / everWrong : o.attempted ? 1 : 0, done: o.attempted > 0 && weakNow === 0, detail: `${weakNow} weak question${weakNow === 1 ? '' : 's'} left` },
    { n: 4, title: 'Mixed questions', goal: 'Attempt the whole bank and score 90%+ over your last 50+ answers', progress: Math.min(1, (o.attempted / o.total) * 0.5 + (o.recentCount >= 50 ? Math.min(1, o.recentAccuracy / 0.9) * 0.5 : 0)), done: mixedOk, detail: `${o.attempted}/${o.total} attempted · recent accuracy ${Math.round(o.recentAccuracy * 100)}% (${o.recentCount} answers)` },
    { n: 5, title: 'Exam simulation', goal: `Pass ${r.mockPassesInARow} mock tests in a row`, progress: Math.min(1, inARow / r.mockPassesInARow), done: inARow >= r.mockPassesInARow, detail: `${inARow} passed in a row · ${exams.length} taken` },
    { n: 6, title: 'Final readiness', goal: 'Meet all of your readiness criteria (Settings)', progress: readyChecks.filter(Boolean).length / readyChecks.length, done: readyChecks.every(Boolean), detail: `${readyChecks.filter(Boolean).length} of ${readyChecks.length} criteria met` },
  ]
}
