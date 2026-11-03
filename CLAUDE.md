# Sober Days

Personal sobriety day counter with a daily quote, question or practice. A one-person app: the owner is also the only user. Plain HTML, CSS and JavaScript, no build step, no dependencies, no framework. Runs as a PWA on the owner's phone (Fairphone 6, Android); a native Android version is planned later.

Product decisions, the backup plan and ideas for later live in [NOTES.md](NOTES.md). Read it before proposing features, and record new decisions there.

## Files

- `index.html` — all markup and all CSS (one `<style>` block, design tokens on `:root`).
- `app.js` — all behaviour, one IIFE split into sections: Storage, Date math, Formatting, UI, Hard moment (breathing), Celebrate.
- `content.js` — the daily items (`CONTENT` array: `quote` / `question` / `practice` / `thought`). Plain data on purpose, so it can become a JSON file in the Android app.
- `sw.js` — service worker: network first, cache as offline fallback.
- `manifest.json`, `icons/`, `fonts/` — PWA manifest, icons, bundled IBM Plex fonts.
- `versions/v1-base/` — a frozen snapshot of an earlier design. Never edit it; it is only replaced when the owner asks to "save the base version".

## Running locally

Service workers need http, not `file://`. From the project root:

```bash
python -m http.server 8000
```

(or `npx serve .` if Node is installed), then open http://localhost:8000. Any static file server works. To start fresh, clear `localStorage` key `sober-days:v1` and unregister the service worker in DevTools.

There are no tests or linters. Check changes in the browser at phone width (about 390 px), in both light and dark mode.

## Deploying: pushing to `main` updates the live app

GitHub Pages serves `main` at https://okeyokey319.github.io/sober-days/, and the phone loads it from there. **A push to `main` is a release to the owner's phone.** Work on a branch and push or merge to `main` only when asked.

## Rules that are easy to miss

- **Bump `CACHE` in `sw.js`** (`sober-days-vN` → `vN+1`) in every commit that changes a file the app serves. Add any new served file to `FILES`, or it will be missing offline.
- **Dates are local calendar days.** Use the helpers in the Date math section (`parseISODate`, `daysBetween`, `addMonths`…), never raw `Date` arithmetic or UTC parsing of `YYYY-MM-DD`, or the count shifts by a day around midnight and DST.
- **Data stays on the device.** One `localStorage` key, `sober-days:v1`, with every access wrapped in try/catch. No analytics, no network calls, no external fonts or CDNs: the app must work fully offline. If the stored shape changes, keep reading the old shape.
- **The daily item** is picked by days since `CONTENT_EPOCH`, cycling through `CONTENT` in order. Appending items is safe; reordering or deleting changes what past and future days show.
- UI text is English. Tone is calm, warm and plain: no exclamation marks, no gamification, no guilt. This is an app for hard days too.

## Design

The visual language is settled and was iterated by hand; keep it unless asked to change it.

- Calm and neutral: warm off-white / near-black backgrounds, one sage accent (`--accent`, `--accent-soft`), thin lines, generous spacing, single column capped at 440 px.
- Type: IBM Plex Sans (light weights, tabular numbers for counts) and IBM Plex Serif 300 for headings and the daily text.
- Colours only through the tokens on `:root`; each token has a dark-mode value under `prefers-color-scheme: dark`. The app follows the phone's theme; the launch screen and icon are always dark (`#111110`).
- Motion is soft and slow. Every animation needs a `prefers-reduced-motion` fallback.
- Touch first: the Celebrate button is press-and-hold with vibration; keep tap highlight off and touch targets comfortable.

### The Hallmark skill

A copy of the [Hallmark](https://github.com/Nutlope/hallmark) design skill is installed locally in `.claude/skills/hallmark` (`.claude/` is gitignored, so it is not in the repo). Hallmark is built for websites and landing pages, and some of its rules clash with decisions made here (for example, it bans the small uppercase labels this app uses as `.eyebrow`). So:

- Use it only when the owner names it, and by default as `/hallmark audit <file>`, a report only.
- Do not let it re-theme the app or rewrite screens. Take its findings as suggestions and apply the ones that fit, in this app's own style.

## Working style

- Small, focused commits with a plain-English subject saying what changed for the user, as in the existing history (`Celebrate fixes: no tap highlight, vibration on finger lift, fireflies start sooner`).
- Keep the no-build, no-dependency setup. Ask before adding a library, a build tool or a framework.
- Keep the code comments' habit: explain *why*, briefly, where it is not obvious.
