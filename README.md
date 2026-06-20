# 夏 2026 — Summer Plan Tracker

A single-page personal dashboard for tracking goals across a summer (Jun–Sep 2026).  
All data lives in your browser's `localStorage` — nothing is sent anywhere.

**[Open the app](https://ludanyuan.github.io/summer2026-planner/summer2026.html)**

## Tabs

| Tab | What it tracks |
|-----|---------------|
| 总览 Overview | Progress summary across all areas |
| EP | Music EP production pipeline (tracks, stages, checklist) |
| 影视书籍 Reading | Books and films with status and notes |
| 工作 Work | Daily work log (summary, professor / coworker / clocked-in flags) |
| 管弦乐课 Orchestration | Week-by-week Saturday class tracker with assignments |
| Practice | Daily piano practice and exercise streaks |
| 作曲 Composition | Piece-by-piece task lists and diary |
| 作曲家 Composers | Study log for composer research (Yoshimatsu, Takemitsu, …) |
| 未来 Future | Career goals, research directions, weekly hour targets |

## Usage

Open `summer2026.html` directly in a browser (no server needed — `index.html` is an earlier, simpler version).  
Everything auto-saves to `localStorage` as you type.

To back up your data: open the browser console and run `localStorage.getItem('summer2026')`, then save the JSON string somewhere safe.
