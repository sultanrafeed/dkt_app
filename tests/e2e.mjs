// End-to-end check of the built app in a real browser (desktop + iPhone sizes).
// Usage: npm run build && npm run e2e   (starts `vite preview` itself)
import { chromium, devices } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const PORT = 4179
const BASE = `http://localhost:${PORT}/`
const OUT = process.env.SHOTS ?? 'test-results'
mkdirSync(OUT, { recursive: true })
const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium'

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((r) => { server.stdout.on('data', (d) => String(d).includes('Local') && r()); setTimeout(r, 6000) })

let failures = 0
const results = []
async function check(name, fn) {
  try { await fn(); results.push(`✓ ${name}`) } catch (e) { failures++; results.push(`✗ ${name}\n    ${String(e.message ?? e).split('\n')[0]}`) }
}
const assert = (c, m) => { if (!c) throw new Error(m) }

const browser = await chromium.launch({ executablePath: exe })

async function run(label, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const shot = (n) => page.screenshot({ path: `${OUT}/${label}-${n}.png`, fullPage: false })
  const noHScroll = async () => {
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    assert(sw <= iw + 1, `horizontal scroll: ${sw} > ${iw}`)
  }

  await check(`[${label}] home loads with full bank`, async () => {
    await page.goto(BASE)
    await page.getByText('Your goal: be fully prepared.').waitFor()
    assert(await page.getByText('0 / 358').isVisible(), 'mastered counter shows 358')
    await noHScroll()
    await shot('home')
  })

  await check(`[${label}] practice: picture questions with feedback, bookmark, retry`, async () => {
    await page.goto(BASE + '#/practice')
    await page.getByRole('radio', { name: /Picture questions/ }).click()
    await page.getByLabel('Number of questions').selectOption('10')
    await page.getByRole('button', { name: /Start 10 questions/ }).click()
    await page.getByText('Question 1 of 10').waitFor()
    const img = page.locator('.qimage img')
    await img.waitFor()
    assert(await img.evaluate((i) => i.complete && i.naturalWidth > 50), 'question image rendered')
    await noHScroll()
    await shot('question')
    await page.locator('.option').first().click()
    await page.locator('.feedback').waitFor()
    assert(await page.getByText('Official answer').first().isVisible(), 'official answer shown')
    assert(await page.getByText(/Source:/).isVisible(), 'source reference shown')
    await shot('feedback')
    if (await page.getByRole('button', { name: /Try again/ }).isVisible()) {
      await page.getByRole('button', { name: /Try again/ }).click()
      assert(!(await page.locator('.feedback').isVisible()), 'retry hides feedback')
      await page.locator('.option').first().click()
    }
    await page.getByRole('button', { name: /Bookmark/ }).first().click()
    for (let i = 1; i < 10; i++) {
      await page.getByRole('button', { name: /Next/ }).click()
      await page.getByText(`Question ${i + 1} of 10`).waitFor()
      await page.locator('.option').nth(i % 3).click()
    }
    await page.getByRole('button', { name: /^Finish$/ }).last().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Finish' }).click()
    await page.getByText('Session complete').waitFor()
    await shot('results')
  })

  await check(`[${label}] mistakes review & retry-all`, async () => {
    await page.goto(BASE + '#/mistakes')
    const n = await page.locator('article.review').count()
    if (n) {
      await page.getByRole('button', { name: /Retry all/ }).click()
      await page.getByText(/Question 1 of/).waitFor()
      await page.goto(BASE + '#/')
    }
  })

  await check(`[${label}] search finds "roundabout" and "40 km/h"`, async () => {
    await page.goto(BASE + '#/search?q=roundabout')
    await page.getByRole('heading', { name: /Questions \(\d+\)/ }).waitFor()
    const h = await page.getByRole('heading', { name: /Questions \(\d+\)/ }).textContent()
    assert(Number(h.match(/\d+/)[0]) >= 10, `roundabout hits ${h}`)
    await page.goto(BASE + '#/search?q=40%20km%2Fh')
    const h2 = await page.getByRole('heading', { name: /Questions \(\d+\)/ }).textContent()
    assert(Number(h2.match(/\d+/)[0]) >= 3, `40 km/h hits ${h2}`)
    const hb = await page.getByRole('heading', { name: /Road User Handbook \(\d+/ }).textContent()
    assert(Number(hb.match(/\d+/)[0]) >= 3, `handbook hits ${hb}`)
  })

  await check(`[${label}] question bank filters & bookmark persisted`, async () => {
    await page.goto(BASE + '#/bank')
    await page.getByLabel('Show').selectOption('images')
    await page.getByText('194 questions').waitFor()
    await page.getByLabel('Show').selectOption('bookmarked')
    await page.getByText('1 question', { exact: true }).waitFor()
    await page.getByLabel('Show').selectOption('all')
    await page.getByLabel('Category').selectOption('Traffic Signs')
    await page.getByText('51 questions').waitFor()
  })

  await check(`[${label}] mock test: unanswered warning, submit, pass/fail`, async () => {
    await page.goto(BASE + '#/mock')
    await page.getByRole('button', { name: 'Start mock test' }).click()
    await page.getByText('Question 1 of 45').waitFor()
    assert(!(await page.locator('.feedback').isVisible()), 'no feedback in exam')
    for (let i = 0; i < 3; i++) {
      await page.locator('.option').first().click()
      assert(!(await page.locator('.feedback').isVisible()), 'still no feedback')
      await page.getByRole('button', { name: /Next/ }).click()
    }
    await shot('exam')
    await page.getByRole('button', { name: 'Submit test' }).first().click()
    await page.getByText(/42.*unanswered question/).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Submit test' }).click()
    await page.getByText('Mock test result').waitFor()
    assert(await page.getByText(/NOT YET A PASS|PASS/).first().isVisible(), 'verdict shown')
    assert(await page.getByRole('cell', { name: 'General knowledge' }).isVisible(), 'part breakdown')
    await shot('exam-result')
  })

  await check(`[${label}] progress persists after reload`, async () => {
    await page.reload()
    await page.goto(BASE + '#/progress')
    await page.getByText('Questions attempted').waitFor()
    const n = await page.locator('.stat-n').first().textContent()
    assert(Number(n) >= 10, `attempted after reload = ${n}`)
    await noHScroll()
    await shot('progress')
  })

  await check(`[${label}] learn section + handbook page scan`, async () => {
    await page.goto(BASE + '#/learn/roundabouts')
    await page.getByRole('heading', { name: 'Roundabouts', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'View original pages' }).click()
    const scan = page.locator('.pagescan')
    await scan.waitFor()
    await page.waitForFunction(() => { const i = document.querySelector('.pagescan'); return i && i.complete && i.naturalWidth > 100 })
    await shot('learn')
    await page.keyboard.press('Escape')
  })

  await check(`[${label}] flashcards & road signs`, async () => {
    await page.goto(BASE + '#/flashcards')
    await page.getByRole('button', { name: /Reveal answer/ }).click()
    await page.getByRole('button', { name: /Known/ }).click()
    await page.getByText('Card 2 of').waitFor()
    await page.goto(BASE + '#/signs')
    await page.locator('.sign-tile').first().click()
    await page.getByRole('button', { name: 'Reveal meaning' }).click()
    await page.getByText('Official answer').first().waitFor()
  })

  await check(`[${label}] full marks stages`, async () => {
    await page.goto(BASE + '#/full-marks')
    await page.getByText('Stage 6').waitFor()
    await shot('fullmarks')
  })

  await check(`[${label}] works offline after first visit`, async () => {
    await page.goto(BASE)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    await ctx.setOffline(true)
    await page.goto(BASE + '#/bank')
    await page.getByText('358 questions', { exact: true }).waitFor({ timeout: 8000 })
    await page.goto(BASE + '#/q/SI013')
    await page.waitForFunction(() => { const i = document.querySelector('.qimage img'); return i && i.complete && i.naturalWidth > 50 })
    await ctx.setOffline(false)
  })

  await check(`[${label}] no console errors`, async () => {
    assert(!errors.length, errors.slice(0, 3).join(' | '))
  })
  await ctx.close()
}

await run('desktop', { viewport: { width: 1280, height: 860 } })
const { defaultBrowserType: _ignored, ...iphone } = devices['iPhone 13']
await run('iphone', iphone)

await browser.close()
server.kill()
console.log(results.join('\n'))
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
