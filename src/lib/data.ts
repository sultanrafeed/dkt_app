import { createContext, useContext } from 'react'
import type { Handbook, Question, QuestionBank } from './types'

export interface Data {
  bank: QuestionBank
  questions: Question[]
  byId: Map<string, Question>
  handbook: Handbook | null
}

export const DataContext = createContext<Data | null>(null)

export function useData(): Data {
  const d = useContext(DataContext)
  if (!d) throw new Error('data not loaded')
  return d
}

export async function loadBank(): Promise<QuestionBank> {
  const r = await fetch('./data/questions.json')
  if (!r.ok) throw new Error(`Could not load the question bank (${r.status})`)
  return r.json()
}

export async function loadHandbook(): Promise<Handbook> {
  const r = await fetch('./data/handbook.json')
  if (!r.ok) throw new Error(`Could not load the handbook (${r.status})`)
  return r.json()
}

/** Questions whose picture shows a road sign (used by the Road Signs trainer). */
export function isSignQuestion(q: Question): boolean {
  return !!q.image && (q.category === 'Traffic Signs' || /\bsign\b/i.test(q.question))
}

/** Normalise text for search: lower case, unify "40 km/h" / "40km/h" and quotes. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/(\d)\s*(km\/h|kmh|km|m|metres?|seconds?)\b/g, '$1$2')
    .replace(/\s+/g, ' ')
}
