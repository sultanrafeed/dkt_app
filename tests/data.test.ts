import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import type { QuestionBank, Handbook } from '../src/lib/types'

const bank: QuestionBank = JSON.parse(readFileSync('public/data/questions.json', 'utf8'))
const raw = JSON.parse(readFileSync('data/questions.raw.json', 'utf8'))
const hb: Handbook = JSON.parse(readFileSync('public/data/handbook.json', 'utf8'))
const qs = bank.questions

describe('question bank', () => {
  it('imports every question header found in the source PDF', () => {
    expect(raw.length).toBe(358)
    expect(qs.length).toBe(raw.length)
  })
  it('has unique ids and codes', () => {
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
  })
  it('every question has text, 2+ non-empty options and exactly one official answer', () => {
    for (const q of qs) {
      expect(q.question.trim().length, q.id).toBeGreaterThan(5)
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2)
      for (const o of q.options) expect(o.trim().length, q.id).toBeGreaterThan(0)
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex, q.id).toBeLessThan(q.options.length)
    }
  })
  it('official answers match the bold option in the extracted source', () => {
    const byCode = new Map(raw.map((r: { code: string }) => [r.code, r]))
    for (const q of qs) {
      const r = byCode.get(q.id) as { boldOptionCount: number; correctIndex: number; options: string[] }
      expect(r.boldOptionCount, q.id).toBe(1)
      expect(q.correctIndex, q.id).toBe(r.correctIndex)
      expect(q.options[q.correctIndex].replace(/^\.\s*/, ''), q.id).toBe(r.options[r.correctIndex].replace(/^\.\s*/, ''))
    }
  })
  it('every picture question has an image file on disk', () => {
    const withImg = qs.filter((q) => q.image)
    expect(withImg.length).toBe(194)
    for (const q of withImg) expect(existsSync(`public/${q.image!.src}`), q.id).toBe(true)
  })
  it('questions that refer to a picture have one', () => {
    const re = /this sign|these lights|this light|diagram|shown|marked [A-Z]\b|picture|these markings/i
    for (const q of qs) if (re.test(q.question)) expect(q.image, q.id).not.toBeNull()
  })
  it('uses the source categories and sections only', () => {
    const cats = new Set(['ICAC', 'General Knowledge', 'Alcohol and Drugs', 'Bicycle Safety', 'Fatigue and Defensive Driving', 'Intersections', 'Traffic Lights / Lanes', 'Negligent Driving', 'Pedestrians', 'Seat Belts / Restraints', 'Speed Limits', 'Traffic Signs'])
    for (const q of qs) expect(cats.has(q.category), `${q.id} ${q.category}`).toBe(true)
    expect(new Set(qs.map((q) => q.section))).toEqual(new Set(['Introduction', 'General Knowledge', 'Road Safety', 'Traffic Signs']))
  })
  it('handbook links point at real handbook sections', () => {
    const ids = new Set(hb.sections.map((s) => s.id))
    for (const q of qs) for (const t of q.topics) expect(ids.has(t.id), `${q.id} -> ${t.id}`).toBe(true)
  })
})

describe('handbook', () => {
  it('has all 212 pages with page scans', () => {
    expect(hb.pages.length).toBe(212)
    for (const p of hb.pages) expect(existsSync(`public/${p.image}`), p.image).toBe(true)
  })
  it('has the sections listed in its contents', () => {
    const titles = hb.sections.map((s) => s.title)
    for (const t of ['Speed limits', 'Roundabouts', 'Intersections', 'Railway level crossings', 'No parking', 'Demerit points', 'Motorways and freeways'])
      expect(titles).toContain(t)
  })
})
