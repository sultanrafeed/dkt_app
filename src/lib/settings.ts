import type { ExamConfig, Settings } from './types'

/**
 * The supplied PDFs do not state how many questions the real DKT has or what
 * the pass mark is. This default mirrors the commonly published NSW DKT format
 * (45 questions: 15 general knowledge with 12 needed, 30 road safety with 29
 * needed). It is NOT from the supplied documents and is editable in Settings.
 */
export const DEFAULT_EXAM: ExamConfig = {
  parts: [
    { label: 'General knowledge', sections: ['Introduction', 'General Knowledge'], count: 15, passMark: 12 },
    { label: 'Road safety', sections: ['Road Safety', 'Traffic Signs'], count: 30, passMark: 29 },
  ],
  timeLimit: 0,
  showTimer: true,
}

export const EXAM_CONFIG_NOTICE =
  'Test length and pass marks are configurable. The defaults are not stated in the supplied PDFs — they follow the commonly published NSW DKT format. Check the current format with Transport for NSW / Service NSW.'

export const DEFAULT_SETTINGS: Settings = {
  exam: DEFAULT_EXAM,
  readiness: { attemptedPct: 100, masteredPct: 90, recentAccuracyPct: 95, mockPassesInARow: 3 },
  revealMode: 'immediate',
  shuffleOptions: true,
  goalAccuracy: 95,
  theme: 'system',
  textSize: 'normal',
  highContrast: false,
  reduceMotion: false,
}

export const SOURCE_NOTICE =
  'This study app is based on the supplied NSW DKT question document (2018) and the NSW Road User Handbook (February 2026). Always verify current NSW requirements with Transport for NSW before taking your test.'
