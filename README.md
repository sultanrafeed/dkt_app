# NSW DKT Trainer

A study app for the NSW Driver Knowledge Test (Class C, car). It runs in any browser, installs on iPhone as an app and works offline.

It is built from the two supplied PDFs only:

- `driver-knowledge-test-questions-car.pdf`: **all 358 questions**, 1,074 answer choices and **194 pictures**
- `Road-User-Handbook-English.pdf`: all 212 pages, split into 78 sections, with a scan of every page

> This study app is based on the supplied NSW DKT question document (2018) and the NSW Road User Handbook (February 2026). Always check current NSW requirements with Transport for NSW before your test.

## What's in it

| Area | What it does |
|---|---|
| **Home** | Your accuracy, mastered count and streaks, plus buttons for Continue learning, Weak areas, Mock test, Full Marks, Mistakes and Learn |
| **Learn** | The handbook, organised into its own parts and sections. Shows how many DKT questions each section has and how you're doing on them. Page scans show the diagrams. There's a "Practise this topic" button on each section |
| **Practice** | Choose which questions (all, unseen, weak, keep getting wrong, due for review, not mastered, pictures, signs, bookmarked, marked for review), narrow by official category or handbook topic, and choose the order (adaptive, balanced, random, source order). Answers can be shown after each question or at the end. Each question shows the official answer, the source page and handbook links, and has Try again, Skip, Previous/Next, Bookmark, Mark for review, Report issue and Show answer |
| **Mock Test** | Random questions, balanced across categories, no duplicates. Timer, question navigator, flag-for-later and an unanswered-question warning. No answers or hints until you submit. Results show score, percentage, pass/fail for each part, a category breakdown, a mistake review and "Retry all mistakes" |
| **Full Marks Training** | Six stages: Learn, Practice, Weak Areas, Mixed, Exam Simulation and Final Readiness. Each is measured from your real answers. "Ready" only appears once your readiness criteria are met, and never promises a score |
| **Mistakes** | Current mistakes, questions you keep getting wrong, and questions you've ever got wrong. Retry all of them, or practise one at a time |
| **Flashcards** | The official question (and picture) on the front and the official answer on the back. Rate each card Known, Unsure or Need to review, and study those decks later |
| **Road Signs** | Quiz on the 74 sign questions, practise all 194 picture questions, and a sign gallery with the meanings hidden until you reveal them |
| **Question Bank** | Browse and search all 358 questions. Filter by category, unanswered, answered incorrectly, weak, mastered, bookmarked, marked for review, has a picture, or source needs checking |
| **Search** | Searches question text, answers, codes, categories, handbook topics and the full handbook text. `40 km/h` and `40km/h` match each other |
| **Progress** | Overall progress, mastery breakdown, goal (for example 95%+), weak areas, category and topic performance, recent sessions and achievements |
| **Settings** | Mock test format, readiness criteria, feedback mode, answer shuffling, theme, text size, high contrast, reduced motion, offline handbook download, progress export/import/reset, and export of issue reports |

### How mastery works (spaced repetition)

Each question moves through ✗ Don't know → ! Learning → ◐ Almost mastered → ✓ Mastered.

- A correct answer moves a question up one box. After box 2, it can only move up once per day. A wrong answer sends it back to box 1.
- **Mastered** means box 4 and at least 3 correct in a row. That takes correct answers on at least 3 different days, so one lucky answer never counts as mastered.
- Adaptive practice picks questions by weight. Recently wrong questions come up far more often than mastered ones, and reviews become due after 10 minutes, then 1, 3, 7 and 16 days.

## Where the answers come from

- **Official answer:** in the question PDF the correct option is printed in **bold** (Arial-Black / Arial-BoldMT) and the other options are regular weight. The extractor takes the answer from that formatting. Every question has exactly one bold option, and answers are never guessed from their position.
- **Explanations:** at your request, the app contains no written explanations. Each question links instead to the relevant handbook section and page, so you can read the official wording.
- **Handbook links** are matched automatically by topic keywords and are labelled that way in the app.
- **Mock test format:** the PDFs don't say how many questions the real test has or what the pass mark is. The default of 45 questions (15 general knowledge, 12 needed to pass; 30 road safety, 29 needed) follows the commonly published NSW format. It is **not from the supplied documents**, is labelled as such in the app, and can be changed in Settings.
- Nothing from the internet has been mixed into the questions or the handbook text.

## Extraction summary

See [`data/extraction-report.md`](data/extraction-report.md) for the full report.

```text
Total source questions:            358
Successfully imported:             358
Questions with images:             194 (193 embedded pictures + 1 vector sign)
Questions without images:          164
Questions requiring manual review:   8
Missing/uncertain data:              0 validation errors
```

Other checks:

- Every question code that appears anywhere in the PDF text was imported.
- Gaps in the numbering (for example CG003–CG005) are numbers the source document itself skips.
- All 193 embedded pictures in the PDF are each assigned to exactly one question.

### Questions to double-check

The official answer is kept exactly as printed for all of these. The app shows a ⚠ note on each one.

| Question | Why |
|---|---|
| ICAC1 | The 6-week re-test ban is only in the question document, not the handbook |
| ND040 | "3 demerit points" for street racing isn't stated in the 2026 handbook |
| CG062, CG064 | Say "RTA"; the handbook now says Transport for NSW |
| AD034 | Question says "serious" crashes; the handbook says around 50% of *fatal* crashes |
| IN039 | The 2026 handbook describes red-light *speed* cameras that also catch speeding |
| CG110 | The handbook doesn't mention headlights flashing on the front of a bus |
| CG045 | The handbook's list of crash details differs slightly from the answer wording |

The only text changes made during extraction were two formatting artefacts: a stray "RUH" in two category labels, and leading dots on the PD031 options.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run preview      # serve the build (offline mode works here)
```

Checks:

```bash
npm run validate     # rebuild the dataset and run all data checks (fails on any problem)
npm test             # unit tests: data integrity, mastery rules, randomisation, mock tests
npm run build && npm run e2e   # browser tests on desktop and iPhone 13 sizes
```

The browser tests cover starting a quiz, answering, feedback, retrying, bookmarking, finishing, the mistakes review, search, filters, the mock test with the unanswered warning and pass/fail, persistence after a page refresh, the handbook page viewer, flashcards, road signs, Full Marks, offline use and horizontal scrolling. They need Chromium; set `CHROMIUM=/path/to/chrome` if it isn't at `/opt/pw-browsers/chromium`.

### Rebuilding the data from the PDFs

```bash
pip install pymupdf pillow
npm run data   # extract questions + images, extract handbook + page scans, build and validate
```

To update the question bank later, replace the PDF and run `npm run data`. The app reads `public/data/*.json`, so no code changes are needed. Manual review notes live in `data/review-notes.json`.

## Use it on iPhone

**Option 1: install the web app (easiest).** Deploy the site (see below), open it in Safari, tap Share, then **Add to Home Screen**. It opens full-screen like an app and works offline after the first visit. Progress is saved on the phone.

**Option 2: native iOS app with Capacitor.** This needs a Mac with Xcode:

```bash
npm install
npm run build
npx cap add ios        # first time only
npx cap sync ios
npx cap open ios       # opens Xcode; pick your iPhone and press Run
```

The native app uses the same build and the same question database.

## Deploying (GitHub Pages)

`.github/workflows/deploy.yml` validates the data, runs the unit tests, builds the app and publishes it to GitHub Pages on every push to `main`.

To turn it on, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**. The app uses relative paths and hash routing, so it works at `https://<user>.github.io/<repo>/`.

## Architecture

```
driver-knowledge-test-questions-car.pdf ─┐
Road-User-Handbook-English.pdf ──────────┤
                                         ▼
scripts/extract_questions.py   text + bold-answer detection + picture crops  → data/questions.raw.json, public/img/q/*.webp
scripts/extract_handbook.py    heading styles → parts/sections/blocks, page scans → data/handbook.json, public/img/hb/*.webp
scripts/build_dataset.py       normalise, link handbook topics, validate, report → public/data/*.json, data/extraction-report.md
                                         ▼
React + TypeScript + Vite app (src/)
  lib/types.ts      data model (Question, QProgress, Settings, sessions)
  lib/store.ts      on-device state in localStorage (no account)
  lib/progress.ts   answer recording, spaced repetition, mastery, statistics
  lib/select.ts     shuffling, category-balanced and weighted selection, mock test building
  lib/session.ts    practice / mock test lifecycle
  lib/goals.ts      Full Marks stages, achievements
  pages/*           one file per screen
vite-plugin-pwa     service worker: precaches the app, questions, handbook text and all question pictures
capacitor.config.ts native iOS shell around the same build
```

## Limitations

- Picture alt text says which question and source page a picture comes from; it doesn't describe the picture in detail. Picture questions still need the picture.
- Handbook text is extracted from the PDF. Tables and diagrams are best read on the page scans, which the app links to throughout.
- The question document is from 2018 and the handbook from 2026. The known differences are flagged above, but a rule that has changed without a matching handbook mention might not be caught.
- Progress is stored per device and browser. Use Export/Import in Settings to move it.
- Issue reports are saved on the device and can be exported; they aren't sent anywhere.
