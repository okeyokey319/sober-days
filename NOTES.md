# Sober Days — notes

Personal app, English UI, calm neutral style. Browser prototype now; the plan is a native Android app for a Fairphone 6 (with Google services), installed directly, not via a store.

## Decisions
- Counter formats: Days and Y · M · D only.
- Milestones: calendar months/years (1, 3, 6, 9 months, then 1, 1.5, 2 … years) plus memorable day counts (111, 222, 444, 555, 666, 777 …). Bar shows previous → next milestone, both ends labelled.
- Hard moment: 1 minute guided breathing, 4 s in / 8 s out, 5 rounds, plus short reminders.
- Base version saved in `versions/v1-base`.
- Launch screen and icon: near-black (#111110) with a thin sage ring. The app itself follows the phone's light/dark theme.
- Live at https://okeyokey319.github.io/sober-days/ (GitHub Pages from `main`), installed on the phone as a PWA.

## Backups — postponed until the Android app
No export/import in the browser version. In the native app use automatic backup:
either Android's built-in backup to the Google account, or auto-saving a backup file to a folder the user picks once (synced to the cloud). Manual export/import as a fallback.

## Ideas for later
- Journal answer to the daily question ("a year ago you wrote…")
- Favourites and own quotes
- Expand daily content to 365 items
- "Why I chose this" reasons list on the Hard moment screen
- Letters to self, opened at the next milestone
- Native: home-screen widget, morning notification
