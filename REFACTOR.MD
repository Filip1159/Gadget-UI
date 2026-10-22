# Refactor roadmap

Delivery: one change, implemented later in the order below (each step must leave `npm test`,
`npm run build` and `npm run e2e` green before starting the next; commit at the end as one change).
Behaviour must not change: the 123 unit specs and 138 Playwright tests are the safety net, so update
them only for moved paths/imports, never to loosen assertions.

## 1. Remove duplication
1. **Connected signal** — DONE. `socketConnected(socket)` in `src/core/socket-status.ts` replaces the copy-pasted
   `computed(() => status() === 'open')` in `steering`, `pose-display`, `sensor-calibration`. (A helper taking
   `{ status }` instead of a new `SocketService` member, so the unit specs' bare `{ status }` mocks keep working.)
2. **Reset on disconnect** — DONE. `onSocketStatus(socket, statuses, reset)` + `NOT_OPEN` in the same file replace the four
   `effect()` blocks in `pose-display`, `sensor-calibration` (`NOT_OPEN`), `robot-preview`, `map-panel` (`['closed']`);
   per-component semantics preserved (`connecting` still does not wipe preview/map).
3. **`RedrawScheduler`** — DONE. (`src/core/redraw-scheduler.ts`): `schedule()` coalesces calls into one `requestAnimationFrame`;
   used by `robot-preview.ts` (`scheduleRedraw`) and `map-panel.ts` (`scheduleRedraw`). Unit-test it with fake rAF.
4. **`downloadFile(name, content, mime)`** — DONE (plus `timestampedName(prefix, ext)`) (`src/core/download.ts`): the Blob/ObjectURL/`<a download>`/revoke sequence from
   `log-panel.ts#download` and `sensor-calibration.ts#download`. Keep the `gadget-log-<iso>.ndjson` and
   `sensor-calibration-<iso>.csv` file names (e2e asserts them).

## 2. Folder structure — DONE
(`socket-status.ts` also lives in `core/socket/`; specs moved with their files; no behaviour change.)
Target:
```
src/
  core/
    socket/    socket.service.ts (+spec), sweep-pairing.ts (+spec)
    protocol/  types, encode, parse, fields, index.ts (replaces protocol.ts barrel), protocol.spec.ts
    log/       raw-log.ts (+spec)
    config.ts, redraw-scheduler.ts, download.ts
  components/ (unchanged; map-panel keeps its geometry helpers)
  app/
```
Steps: `git mv` files and specs together, fix relative imports, keep `index.ts` barrels so component imports stay
`from '.../core/protocol'`. Update the architecture tree and "Components never build or parse wire strings" notes in `CLAUDE.md`.

## 3. Modernise components — DONE (with one deliberate exception)
- `steering.ts`: DONE. `@HostListener` -> `host: { ... }`; `OnInit/OnDestroy` + `speedSub` -> `takeUntilDestroyed()` in the
  constructor and `inject(DestroyRef).onDestroy(() => keyboard.destroy())`. Space `preventDefault`, unfiltered keyup, blur and
  `visibilitychange` stop are unchanged.
- `longpress-button.ts`: **kept `ngOnDestroy` on purpose.** With `DestroyRef` a button removed while held no longer emits
  `release` (the output and the parent's listener are torn down first), so the robot would not get its STOP. Verified in a real
  component tree; `longpress-button.destroy.spec.ts` guards it and the code comment explains it.
- `header.ts`: DONE (empty `imports` dropped).
- `map-panel.ts`: DONE. Pan/zoom moved to the framework-free `map-gestures.ts` (+ `map-gestures.spec.ts`); the component only wires events and redraws.
- `ngModel` in steering/calibration left as is (not trivial to switch).

## 4. Formatting consistency — DONE
(prettier 3.9.10 pinned, `.editorconfig`, `npm run format` / `format:check`; one mechanical pass over 81 files, all tests unchanged and green.)
- Add `prettier` (devDependency) and `.editorconfig`; keep the existing `package.json` prettier block (printWidth 100, singleQuote). Decide indent (2 spaces, Angular default) and semicolons (on).
- Add `npm run format` / `format:check`. Run once over `src/`, `e2e/`, `playwright.config.ts`; **do this last** so the earlier diff stays reviewable (or do it first as a pure-format commit if splitting is ever allowed).
- Document in CLAUDE.md.

## Verification (after all steps)
- `npm run build` (no new budget warnings) and `npx ng test --watch=false` (all 123+ new specs pass).
- `npx tsc -p e2e/tsconfig.json` clean; `npm run e2e` all green, run twice (`--repeat-each=2`) to catch flakiness.
- `git diff --stat` shows only moves, import changes, the new helpers and formatting; no template/CSS behaviour changes.
- Manual smoke (`npm start`): connect, drive with buttons and keys, calibration run + CSV download, log record/download/replay, map pan/zoom.

## Risks / notes
- Reset-on-disconnect helper must preserve per-component semantics (see 1.2).
- Moving files changes import paths in specs and e2e fixtures only if they import from `src/` (e2e does not).
- Formatting changes every file's blame; keep it as the final, mechanical step.
