import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyAnswer, blank, mastery, isWeak, isRepeatMistake } from '../src/lib/progress'
import { balanced, buildExam, optionOrder, weighted, shuffle } from '../src/lib/select'
import { DEFAULT_EXAM } from '../src/lib/settings'
import type { QuestionBank } from '../src/lib/types'

const qs = (JSON.parse(readFileSync('public/data/questions.json', 'utf8')) as QuestionBank).questions
const DAY = 86400000

describe('spaced repetition & mastery', () => {
  it('one correct answer is never mastery', () => {
    const p = applyAnswer(blank(), true)
    expect(mastery(p)).toBe('learning')
  })
  it('many correct answers on the same day cannot reach mastery', () => {
    let p = blank()
    const t = new Date(2026, 0, 5, 9).getTime()
    for (let i = 0; i < 10; i++) p = applyAnswer(p, true, t + i * 60000)
    expect(p.box).toBe(2)
    expect(mastery(p)).toBe('almost')
  })
  it('correct answers spread over days reach mastery', () => {
    let p = blank()
    const t = new Date(2026, 0, 5, 9).getTime()
    p = applyAnswer(p, true, t)
    p = applyAnswer(p, true, t + 1000)
    p = applyAnswer(p, true, t + DAY)
    p = applyAnswer(p, true, t + 3 * DAY)
    expect(mastery(p)).toBe('mastered')
  })
  it('a wrong answer drops back to "don\'t know" and resets the box', () => {
    let p = blank()
    for (let i = 0; i < 5; i++) p = applyAnswer(p, true, Date.now() + i * DAY)
    p = applyAnswer(p, false)
    expect(mastery(p)).toBe('dontknow')
    expect(p.box).toBe(1)
    expect(isWeak(p)).toBe(true)
  })
  it('tracks repeat mistakes', () => {
    let p = applyAnswer(applyAnswer(blank(), false), false)
    expect(isRepeatMistake(p)).toBe(true)
    p = applyAnswer(p, true)
    expect(p.attempts).toBe(3)
    expect(p.correct).toBe(1)
    expect(p.history).toEqual([0, 0, 1])
  })
})

describe('randomisation', () => {
  it('shuffle keeps every element', () => {
    const a = Array.from({ length: 50 }, (_, i) => i)
    expect(shuffle(a).sort((x, y) => x - y)).toEqual(a)
  })
  it('option order is a permutation that keeps the answer text', () => {
    for (const q of qs.slice(0, 50)) {
      const o = optionOrder(q, true)
      expect([...o].sort()).toEqual(q.options.map((_, i) => i))
      expect(q.options[o[o.indexOf(q.correctIndex)]]).toBe(q.options[q.correctIndex])
    }
  })
  it('balanced selection has no duplicates and covers categories', () => {
    const pick = balanced(qs, 40)
    expect(new Set(pick.map((q) => q.id)).size).toBe(40)
    expect(new Set(pick.map((q) => q.category)).size).toBeGreaterThanOrEqual(10)
  })
  it('mock exams use the configured parts with no duplicates, and differ between runs', () => {
    const a = buildExam(qs, DEFAULT_EXAM)
    const b = buildExam(qs, DEFAULT_EXAM)
    expect(a.ids.length).toBe(45)
    expect(new Set(a.ids).size).toBe(45)
    expect(Object.values(a.partOf).filter((p) => p === 0).length).toBe(15)
    expect(a.ids.join()).not.toBe(b.ids.join())
    const byId = new Map(qs.map((q) => [q.id, q]))
    for (const id of a.ids) {
      const part = DEFAULT_EXAM.parts[a.partOf[id]]
      expect(part.sections).toContain(byId.get(id)!.section)
    }
  })
  it('weighted selection prefers questions answered wrongly', () => {
    const prog: Record<string, ReturnType<typeof blank>> = {}
    const t = Date.now()
    for (const q of qs) prog[q.id] = applyAnswer(applyAnswer(applyAnswer(blank(), true, t - 9 * DAY), true, t - 5 * DAY), true, t - 1 * DAY)
    const wrong = qs.slice(0, 20)
    for (const q of wrong) prog[q.id] = applyAnswer(prog[q.id], false)
    let hits = 0
    for (let i = 0; i < 20; i++) hits += weighted(qs, 20, prog).filter((q) => wrong.includes(q)).length
    // 20 of 358 questions (5.6%) — uniform picking would give ~1.1 per 20
    expect(hits / 20).toBeGreaterThan(5)
  })
})
