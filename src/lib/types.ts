export interface TopicRef {
  id: string
  title: string
  startPage: number
  endPage: number
}

export interface Question {
  id: string
  code: string
  /** Category label printed in the source PDF, e.g. "Intersections". */
  category: string
  /** Section heading in the source PDF: General Knowledge / Road Safety / Traffic Signs. */
  section: string
  prefix: string
  question: string
  options: string[]
  /** Index into `options` of the official answer (bold in the source PDF). */
  correctIndex: number
  source: { document: string; page: number; answerEvidence: string }
  image: { src: string; width: number; height: number; alt: string } | null
  topics: TopicRef[]
  review: { type: string; note: string } | null
}

export interface QuestionBank {
  meta: {
    questionSource: string
    handbookSource: string
    total: number
    categories: string[]
    sections: string[]
  }
  questions: Question[]
}

export interface HandbookBlock {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'li' | 'ol' | 'note'
  text: string
  n?: string | null
}

export interface HandbookPage {
  pdfPage: number
  /** Printed page number (null for cover/contents pages). */
  page: number | null
  part: string | null
  section: string | null
  image: string
  blocks: HandbookBlock[]
}

export interface HandbookSection {
  id: string
  part: string
  title: string
  startPage: number
  endPage: number
  startPdfPage: number
  endPdfPage: number
}

export interface Handbook {
  source: string
  pageOffset: number
  sections: HandbookSection[]
  pages: HandbookPage[]
}

/** Per-question learning record, stored on the device. */
export interface QProgress {
  attempts: number
  correct: number
  incorrect: number
  lastAttempted?: number
  lastResult?: 'correct' | 'incorrect'
  /** Consecutive correct answers. */
  streak: number
  /** Spaced-repetition box 0–5. */
  box: number
  nextDue?: number
  /** Day (YYYY-MM-DD) the box last moved up, so one sitting can't reach mastery. */
  lastBoxDay?: string
  bookmarked?: boolean
  flagged?: boolean
  /** Self-rating from flashcards. */
  confidence?: 'known' | 'unsure' | 'review'
  /** Last results, newest last: 1 = correct, 0 = incorrect. */
  history: number[]
}

export type Mastery = 'new' | 'dontknow' | 'learning' | 'almost' | 'mastered'

export interface ExamPart {
  label: string
  /** Source PDF sections this part draws from. */
  sections: string[]
  count: number
  passMark: number
}

export interface ExamConfig {
  parts: ExamPart[]
  /** Minutes; 0 = no limit (the timer still counts up). */
  timeLimit: number
  showTimer: boolean
}

export interface ReadinessCriteria {
  attemptedPct: number
  masteredPct: number
  recentAccuracyPct: number
  mockPassesInARow: number
}

export interface Settings {
  exam: ExamConfig
  readiness: ReadinessCriteria
  revealMode: 'immediate' | 'end'
  shuffleOptions: boolean
  goalAccuracy: number
  theme: 'system' | 'light' | 'dark'
  textSize: 'normal' | 'large'
  highContrast: boolean
  reduceMotion: boolean
}

export interface SessionAnswer {
  id: string
  /** Original option index chosen, or null if skipped/unanswered. */
  chosen: number | null
  correct: boolean
}

export interface SessionRecord {
  id: string
  kind: 'practice' | 'exam'
  title: string
  startedAt: number
  finishedAt: number
  total: number
  correct: number
  answers: SessionAnswer[]
  passed?: boolean
  parts?: { label: string; correct: number; total: number; passMark: number; passed: boolean }[]
}

export interface ActiveSession {
  id: string
  kind: 'practice' | 'exam'
  title: string
  ids: string[]
  /** Display order of options per question: array of original indexes. */
  order: Record<string, number[]>
  idx: number
  answers: Record<string, number>
  /** Questions whose result was already written to progress. */
  recorded: Record<string, boolean>
  /** Questions where the answer has been revealed (practice). */
  revealed: Record<string, boolean>
  flagged: Record<string, boolean>
  skipped: Record<string, boolean>
  startedAt: number
  revealMode: 'immediate' | 'end'
  exam?: ExamConfig
  /** Part index for each question in an exam. */
  partOf?: Record<string, number>
  finished?: boolean
  resultId?: string
}
