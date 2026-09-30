import { useState } from 'react'
import { useData } from '../lib/data'
import { getState, replaceState, resetState, setState, useStore, type State } from '../lib/store'
import { DEFAULT_EXAM, EXAM_CONFIG_NOTICE, SOURCE_NOTICE } from '../lib/settings'
import type { ExamPart, Settings as S } from '../lib/types'

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Settings() {
  const { handbook, bank } = useData()
  const s = useStore((x) => x.settings)
  const reports = useStore((x) => x.reports)
  const [msg, setMsg] = useState('')
  const [dl, setDl] = useState<string>('')
  const set = (patch: Partial<S>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }))
  const setPart = (i: number, patch: Partial<ExamPart>) =>
    set({ exam: { ...s.exam, parts: s.exam.parts.map((p, j) => (j === i ? { ...p, ...patch } : p)) } })

  const cacheHandbook = async () => {
    if (!handbook) return
    try {
      const cache = await caches.open('handbook-pages')
      let n = 0
      for (const p of handbook.pages) {
        const url = new URL(`./${p.image}`, window.location.href).toString()
        if (!(await cache.match(url))) await cache.add(url)
        n++
        if (n % 10 === 0) setDl(`Saving pages… ${n}/${handbook.pages.length}`)
      }
      setDl(`✓ All ${handbook.pages.length} handbook page scans are saved for offline use.`)
    } catch {
      setDl('Could not save pages for offline use in this browser.')
    }
  }

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as State
      if (!data || typeof data !== 'object' || !('progress' in data)) throw new Error()
      replaceState(data)
      setMsg('✓ Progress imported.')
    } catch {
      setMsg('That file is not a DKT Trainer progress export.')
    }
  }

  return (
    <div className="stack">
      <header><h1>Settings</h1></header>

      <section className="card">
        <h2 className="h3">Mock test format</h2>
        <p className="notice small" role="note">⚙ {EXAM_CONFIG_NOTICE}</p>
        {s.exam.parts.map((p, i) => (
          <fieldset key={i} className="field part">
            <legend>{p.label}</legend>
            <div className="grid-3">
              <label className="field"><span>Questions</span>
                <input type="number" min={1} max={200} value={p.count} onChange={(e) => setPart(i, { count: Math.max(1, Number(e.target.value)) })} /></label>
              <label className="field"><span>Correct needed to pass</span>
                <input type="number" min={0} max={p.count} value={p.passMark} onChange={(e) => setPart(i, { passMark: Math.max(0, Math.min(p.count, Number(e.target.value))) })} /></label>
              <label className="field"><span>Label</span>
                <input value={p.label} onChange={(e) => setPart(i, { label: e.target.value })} /></label>
            </div>
            <div className="row wrap gap-s">
              {bank.meta.sections.map((sec) => {
                const on = p.sections.includes(sec)
                return (
                  <label key={sec} className="check">
                    <input type="checkbox" checked={on} onChange={() => setPart(i, { sections: on ? p.sections.filter((x) => x !== sec) : [...p.sections, sec] })} /> {sec}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
        <div className="grid-2">
          <label className="field"><span>Time limit (minutes, 0 = none)</span>
            <input type="number" min={0} max={180} value={s.exam.timeLimit} onChange={(e) => set({ exam: { ...s.exam, timeLimit: Math.max(0, Number(e.target.value)) } })} /></label>
          <label className="check"><input type="checkbox" checked={s.exam.showTimer} onChange={(e) => set({ exam: { ...s.exam, showTimer: e.target.checked } })} /> Show timer during the test</label>
        </div>
        <button className="btn" onClick={() => set({ exam: DEFAULT_EXAM })}>Restore default format</button>
      </section>

      <section className="card">
        <h2 className="h3">Readiness criteria (Full Marks Training)</h2>
        <div className="grid-2">
          <label className="field"><span>Questions attempted (%)</span><input type="number" min={0} max={100} value={s.readiness.attemptedPct} onChange={(e) => set({ readiness: { ...s.readiness, attemptedPct: Number(e.target.value) } })} /></label>
          <label className="field"><span>Questions mastered (%)</span><input type="number" min={0} max={100} value={s.readiness.masteredPct} onChange={(e) => set({ readiness: { ...s.readiness, masteredPct: Number(e.target.value) } })} /></label>
          <label className="field"><span>Recent accuracy (%)</span><input type="number" min={0} max={100} value={s.readiness.recentAccuracyPct} onChange={(e) => set({ readiness: { ...s.readiness, recentAccuracyPct: Number(e.target.value) } })} /></label>
          <label className="field"><span>Mock tests passed in a row</span><input type="number" min={1} max={20} value={s.readiness.mockPassesInARow} onChange={(e) => set({ readiness: { ...s.readiness, mockPassesInARow: Math.max(1, Number(e.target.value)) } })} /></label>
        </div>
      </section>

      <section className="card">
        <h2 className="h3">Practice</h2>
        <label className="field"><span>Default feedback</span>
          <select value={s.revealMode} onChange={(e) => set({ revealMode: e.target.value as S['revealMode'] })}>
            <option value="immediate">Show the answer after each question</option>
            <option value="end">Show answers at the end</option>
          </select></label>
        <label className="check"><input type="checkbox" checked={s.shuffleOptions} onChange={(e) => set({ shuffleOptions: e.target.checked })} /> Shuffle the order of answer choices (wording is never changed)</label>
      </section>

      <section className="card">
        <h2 className="h3">Display &amp; accessibility</h2>
        <div className="grid-2">
          <label className="field"><span>Theme</span>
            <select value={s.theme} onChange={(e) => set({ theme: e.target.value as S['theme'] })}>
              <option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option>
            </select></label>
          <label className="field"><span>Text size</span>
            <select value={s.textSize} onChange={(e) => set({ textSize: e.target.value as S['textSize'] })}>
              <option value="normal">Normal</option><option value="large">Large</option>
            </select></label>
        </div>
        <label className="check"><input type="checkbox" checked={s.highContrast} onChange={(e) => set({ highContrast: e.target.checked })} /> High contrast</label>
        <label className="check"><input type="checkbox" checked={s.reduceMotion} onChange={(e) => set({ reduceMotion: e.target.checked })} /> Reduce motion</label>
      </section>

      <section className="card">
        <h2 className="h3">Offline</h2>
        <p className="small">The app, all {bank.meta.total} questions, all question pictures and the handbook text work offline after the first visit. Handbook page scans (about 9 MB) are saved as you view them, or all at once:</p>
        <button className="btn" onClick={cacheHandbook}>Save all handbook pages for offline</button>
        {dl && <p className="small" role="status">{dl}</p>}
      </section>

      <section className="card">
        <h2 className="h3">Your data</h2>
        <p className="small muted">Progress is stored only on this device. Export it to move to another device or browser.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={() => download(`dkt-progress-${new Date().toISOString().slice(0, 10)}.json`, getState())}>Export progress</button>
          <label className="btn">Import progress<input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
          <button className="btn" disabled={!reports.length} onClick={() => download('dkt-data-issue-reports.json', reports)}>Export {reports.length} issue report{reports.length === 1 ? '' : 's'}</button>
          <button className="btn bad" onClick={() => { if (confirm('Delete all progress, sessions and bookmarks on this device?')) { resetState(); setMsg('Progress reset.') } }}>Reset progress</button>
        </div>
        {msg && <p role="status">{msg}</p>}
      </section>

      <section className="card">
        <h2 className="h3">About the sources</h2>
        <p className="small">{SOURCE_NOTICE}</p>
        <ul className="small plain">
          <li><strong>Questions:</strong> {bank.meta.questionSource}</li>
          <li><strong>Handbook:</strong> {bank.meta.handbookSource}</li>
          <li>Official answers are exactly the options printed in bold in the question document. No content from the internet has been mixed in. The mock test format defaults are the only external information and are labelled as such.</li>
        </ul>
      </section>
    </div>
  )
}
