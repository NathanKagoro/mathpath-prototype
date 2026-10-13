# MathPath

A prototype for practising school algebra (solving linear equations for x), with two sides:

- **Student book.** Three short lessons on a board-game path, then practice that moves up and down a four-level ladder depending on how you answer.
- **Teacher's board.** A class view of one homework: how many answers were right, which slip caused most of the wrong ones, and a mark book.

It is a static site: plain HTML, CSS and ES modules, no framework and no build step.

Hosted at <https://nathankagoro.github.io/mathpath-prototype/> once GitHub Pages is switched on for the repository (Settings → Pages → Source: GitHub Actions).

## What is real and what is illustrative

Real, and covered by tests:

- **Question generator.** `assets/js/engine.mjs` makes questions from a seed on four levels: one step, two steps, brackets, then negatives and x on both sides. The same seed always gives the same questions.
- **Difficulty ladder.** Three first-time correct answers in a row move you up a level, two misses in a row move you down. The same question never comes twice running.
- **Answer checking.** Answers are parsed as numbers, so `4`, `x = 4`, `4.0`, `04`, `16/3`, `5 1/3` and `5.33` are all read properly. Decimals need two places unless they are exact.
- **Diagnosis.** Each question carries the common slips for its type (forgot to multiply out the bracket, sign slip, wrong inverse operation, stopped a step early, divided only part of a side). The wrong working for each is computed line by line, so it ends at the answer that slip really gives. If you type that value, the feedback names the slip. Otherwise the feedback substitutes your value into both sides.
- **Your progress.** Lessons done, practice level, XP, stickers and slips are saved in this browser's `localStorage` and shown on the home, results and sticker pages, and as the "You" row in the teacher's mark book.

Illustrative, and labelled as demo data on every page:

- The class, the six named classmates, their marks and XP, the class progress chart, the live-session alerts and the lesson plan are scripted in `assets/js/demo.mjs`. The class percentages are added up from that one mark table, and each scripted wrong answer is the value the engine computes for that slip.
- Nothing is sent anywhere. "Open to students", "Mark as sent" and the live session only change what the page shows.
- Lesson 4 (word problems) is not built.

There is no server, no accounts and no analytics.

## Run it

Needs Node 22 or later. There is nothing to install for running or unit-testing.

```
npm run serve     # http://127.0.0.1:4340/mathpath-prototype/
npm test          # unit tests: engine, progress store, generated pages (37 tests)
```

The site is served from `/mathpath-prototype/` locally because that is the path it has on GitHub Pages.

Add `?seed=123` to `student/practice.html` to restart the practice ladder from a known seed.

## Build

There is no build. The HTML pages, the icon sprite and the favicon are written by a generator and committed:

```
npm run pages     # rewrites *.html, assets/icons.svg, assets/favicon.svg from tools/make-pages.mjs
npm run site      # copies the published files into _site/ (what Pages deploys)
```

Edit `tools/make-pages.mjs`, not the HTML. `npm test` fails if the committed pages do not match the generator. Worked examples, expected answers and class figures in the pages are computed by the generator from the engine.

## Browser checks and screenshots

These need a browser, which CI installs. Locally:

```
npm install --no-save puppeteer
npm run site
node tools/e2e.cjs _site shots          # 13 checks: Enter submits, progress reaches 100%, ladder climbs, reset, blocked storage
node tools/screenshots.cjs _site shots  # every page at 1440, 390 and 360 px; fails on console errors or sideways scroll
```

`.github/workflows/ci.yml` runs the unit tests, the browser checks and the screenshots on every push and pull request, and uploads the screenshots as an artifact. `.github/workflows/pages.yml` deploys `main` to GitHub Pages.

## Layout

```
index.html            front cover (choose student or teacher)
student/              home, three lessons, practice, results, stickers
teacher/              overview, live class, analytics, lesson plan, homework, mark book
assets/js/engine.mjs  generator, ladder, answer checker, slip diagnosis
assets/js/store.mjs   saved progress (localStorage behind try/catch)
assets/js/demo.mjs    scripted class data
assets/js/student.mjs, teacher.mjs   page wiring
assets/css/           base, cover, student (squared paper), teacher (chalkboard)
tools/                page generator, hand-drawn SVG generator, local server, browser checks
tests/                node --test suites
```

## Credits

Fonts are self-hosted and subsetted: Kalam (Indian Type Foundry) for handwriting and Andika (SIL International) for text and maths, both under the SIL Open Font License; the licence texts are in `assets/fonts/`. All icons, stickers and textures are drawn in SVG and CSS in this repository.

Made by Nathan Kagoro. <https://nathankagoro.com>
