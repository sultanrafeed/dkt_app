import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { DataContext, loadBank, loadHandbook, type Data } from './lib/data'
import { href, useRoute } from './lib/router'
import { useStore } from './lib/store'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Mock from './pages/Mock'
import Session from './pages/Session'
import Results from './pages/Results'
import FullMarks from './pages/FullMarks'
import Mistakes from './pages/Mistakes'
import Flashcards from './pages/Flashcards'
import RoadSigns from './pages/RoadSigns'
import { Bank, QuestionDetail } from './pages/Bank'
import Search from './pages/Search'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import { LearnIndex, LearnSection } from './pages/Learn'
import type { Handbook, QuestionBank } from './lib/types'

const NAV = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/learn', label: 'Learn', icon: '📖' },
  { to: '/practice', label: 'Practice', icon: '✎' },
  { to: '/mock', label: 'Mock Test', icon: '📝' },
  { to: '/full-marks', label: 'Full Marks', icon: '🎯' },
  { to: '/mistakes', label: 'Mistakes', icon: '✗' },
  { to: '/flashcards', label: 'Flashcards', icon: '🂠' },
  { to: '/signs', label: 'Road Signs', icon: '⚠' },
  { to: '/bank', label: 'Question Bank', icon: '☰' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]
const TABS = ['/', '/learn', '/practice', '/mock']

function isActive(path: string, to: string) {
  return to === '/' ? path === '/' : path === to || path.startsWith(to + '/')
}

export default function App() {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [handbook, setHandbook] = useState<Handbook | null>(null)
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(false)
  const { path, query } = useRoute()
  const settings = useStore((s) => s.settings)
  const inExam = useStore((s) => s.active?.kind === 'exam') && path === '/session'

  useEffect(() => {
    loadBank().then(setBank).catch((e) => setError(String(e.message ?? e)))
    loadHandbook().then(setHandbook).catch(() => { /* Learn shows a loading state */ })
  }, [])

  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = settings.theme === 'system' ? '' : settings.theme
    if (settings.theme === 'system') delete r.dataset.theme
    r.classList.toggle('large-text', settings.textSize === 'large')
    r.classList.toggle('high-contrast', settings.highContrast)
    r.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings])

  useEffect(() => setMenu(false), [path])

  const data: Data | null = useMemo(
    () => (bank ? { bank, questions: bank.questions, byId: new Map(bank.questions.map((q) => [q.id, q])), handbook } : null),
    [bank, handbook],
  )

  if (error) return <div className="empty"><h1>Couldn't load the question bank</h1><p>{error}</p><button className="btn" onClick={() => location.reload()}>Try again</button></div>
  if (!data) return <div className="empty" aria-busy="true">Loading question bank…</div>

  const seg = path.split('/').filter(Boolean)
  let page: ReactElement
  switch (seg[0]) {
    case undefined: page = <Home />; break
    case 'learn': page = seg[1] ? <LearnSection id={seg[1]} key={seg[1]} /> : <LearnIndex />; break
    case 'practice': page = <Practice initialPool={query.get('pool') ?? undefined} key={query.toString()} />; break
    case 'mock': page = <Mock />; break
    case 'session': page = <Session />; break
    case 'results': page = <Results id={seg[1]} />; break
    case 'full-marks': page = <FullMarks />; break
    case 'mistakes': page = <Mistakes />; break
    case 'flashcards': page = <Flashcards />; break
    case 'signs': page = <RoadSigns />; break
    case 'bank': page = <Bank query={query} key={query.toString()} />; break
    case 'q': page = <QuestionDetail id={seg[1]} />; break
    case 'search': page = <Search query={query} key={query.toString()} />; break
    case 'progress': page = <Progress />; break
    case 'settings': page = <Settings />; break
    default: page = <div className="empty"><h1>Page not found</h1><a href={href('/')}>Home</a></div>
  }

  return (
    <DataContext.Provider value={data}>
      <a className="skip" href="#main">Skip to content</a>
      <div className={`shell ${inExam ? 'focus-mode' : ''}`}>
        {!inExam && (
          <aside className={`sidebar ${menu ? 'open' : ''}`} aria-label="Main navigation">
            <a className="brand" href={href('/')}><img src="./icon.svg" alt="" width={32} height={32} /> <span>NSW DKT Trainer</span></a>
            <nav>
              <ul>
                {NAV.map((n) => (
                  <li key={n.to}>
                    <a href={href(n.to)} className={isActive(path, n.to) ? 'active' : ''} aria-current={isActive(path, n.to) ? 'page' : undefined}>
                      <span className="nav-i" aria-hidden>{n.icon}</span>{n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        {menu && <div className="scrim" onClick={() => setMenu(false)} aria-hidden />}
        <main id="main" tabIndex={-1}>{page}</main>
        {!inExam && (
          <nav className="tabbar" aria-label="Quick navigation">
            {NAV.filter((n) => TABS.includes(n.to)).map((n) => (
              <a key={n.to} href={href(n.to)} className={isActive(path, n.to) ? 'active' : ''} aria-current={isActive(path, n.to) ? 'page' : undefined}>
                <span aria-hidden>{n.icon}</span><span>{n.label}</span>
              </a>
            ))}
            <button onClick={() => setMenu(!menu)} aria-expanded={menu} className={menu ? 'active' : ''}>
              <span aria-hidden>☰</span><span>More</span>
            </button>
          </nav>
        )}
      </div>
    </DataContext.Provider>
  )
}
