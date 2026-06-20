const STORAGE_KEY = "summer2026PlanTrackerData";
const TABS = [
  ["dashboard", "总览"], ["ep", "EP 制作"], ["reading", "阅读"], ["work", "工作"],
  ["orchestration", "管弦乐课"], ["practice", "每日练琴"], ["composition", "作曲计划"],
  ["listening", "作曲家 / 听歌分析"], ["workspace", "未来规划 & Workspace"]
];
const STATUSES = ["Not Started", "In Progress", "Done", "Paused", "Blocked"];
const PRIORITIES = ["Low", "Medium", "High"];
const ENCOURAGEMENTS = [
  "今天也顺利下班就很了不起。",
  "慢慢写，慢慢听，慢慢长出来。",
  "不是每一天都要爆发，保持连接就好。",
  "给未来的自己留一点声音。"
];
const STAGE_NAMES = [
  "想法 / emotional seed", "concept design", "composition / chords / melody",
  "lyrics or text idea", "arrangement structure", "sound design / production palette",
  "recording / MIDI performance", "editing / cleanup", "rough mix", "final mix",
  "mastering", "final export"
];
const COMPOSITION_STAGES = [
  "review existing material", "mark problems on score", "decide form / expansion plan",
  "revise harmony", "revise motives", "revise transitions", "check instrumental idiomatic writing",
  "revise piano part", "revise violin part", "revise cello part", "revise clarinet part",
  "prepare readable score", "prepare parts", "mockup / MIDI demo", "rehearsal notes",
  "live recording plan", "final revision after recording"
];
const PRACTICE_EMOJIS = ["🎹", "🌱", "🐣", "🌙", "✨", "🫧", "🍵", "🐈"];

let appData = null;
let activeTab = "dashboard";
let saveTimer = null;

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDateRange(start, end) {
  const dates = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getWeekRanges(start, end) {
  const dates = getDateRange(start, end);
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    const chunk = dates.slice(i, i + 7);
    weeks.push({ id: `week-${weeks.length + 1}`, start: chunk[0], end: chunk[chunk.length - 1], dates: chunk });
  }
  return weeks;
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" });
}

function getTodayInRange() {
  const today = new Date().toISOString().slice(0, 10);
  if (today < appData.settings.startDate) return { today, inRange: false, label: "计划尚未开始" };
  if (today > appData.settings.endDate) return { today, inRange: false, label: "计划已结束" };
  return { today, inRange: true, label: formatDate(today) };
}

function dayOfWeek(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("zh-CN", { weekday: "short" });
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, Math.round(n || 0)));
}

function calculateCheckboxProgress(items) {
  if (!items.length) return 0;
  return clampPercent((items.filter(Boolean).length / items.length) * 100);
}

function calculateStreak(days, key = "done") {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let longest = 0;
  let rolling = 0;
  for (const day of sorted) {
    if (day[key]) {
      rolling += 1;
      longest = Math.max(longest, rolling);
    } else {
      rolling = 0;
    }
  }
  const today = getTodayInRange().today;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].date > today) continue;
    if (sorted[i][key]) current += 1;
    else break;
  }
  return { current, longest };
}

function buildChecklist(labels) {
  return labels.map(label => ({ id: uid("chk"), label, done: false }));
}

function createSeedData() {
  const startDate = "2026-06-08";
  const endDate = "2026-09-01";
  const allDates = getDateRange(startDate, endDate);
  const weekdays = allDates.filter(d => {
    const day = new Date(`${d}T00:00:00`).getDay();
    return day !== 0 && day !== 6;
  });
  const epTracks = ["Intro", "Song 1", "Interlude 1", "Song 2", "Interlude 2", "Song 3", "Outro"].map((title, index) => ({
    id: uid("track"),
    title,
    type: title.includes("Song") ? "Song" : title.includes("Interlude") ? "Interlude" : title,
    mood: "",
    bpm: "",
    key: "",
    mainIdea: "",
    references: "",
    status: "Not Started",
    notes: "",
    expanded: index < 2,
    stages: buildChecklist(STAGE_NAMES)
  }));
  return {
    settings: { startDate, endDate, epTitle: "i feel...", concept: "", sonicPalette: "", references: "" },
    ep: {
      releaseChecklist: buildChecklist([
        "EP concept locked", "tracklist locked", "all compositions drafted", "all arrangements done",
        "all recordings done", "all mixes done", "all masters done", "artwork idea", "metadata / credits",
        "export final WAV", "export final MP3", "decide release / sharing platform", "write short artist statement"
      ]),
      tracks: epTracks
    },
    reading: {
      days: allDates.map(date => ({ date, read: false, minutes: 0, book: "", note: "" })),
      books: [
        { id: uid("book"), title: "Ant Encounters: Interaction Networks and Colony Behavior", author: "Deborah M. Gordon", category: "Complex Systems / Cognitive Science / Biology", priority: "High", status: "Not Started", currentPage: 0, totalPages: "", manualProgress: 0, startDate: "", finishDate: "", notes: "", takeaways: "", related: "" },
        { id: uid("book"), title: "On Writing: A Memoir of the Craft", author: "Stephen King", category: "Writing / Craft", priority: "High", status: "Not Started", currentPage: 0, totalPages: "", manualProgress: 0, startDate: "", finishDate: "", notes: "", takeaways: "", related: "" },
        { id: uid("book"), title: "Confronting Silence", author: "Toru Takemitsu", category: "Music / Aesthetics / Composition", priority: "High", status: "Not Started", currentPage: 0, totalPages: "", manualProgress: 0, startDate: "", finishDate: "", notes: "", takeaways: "", related: "武满彻分析" }
      ]
    },
    work: {
      days: weekdays.map(date => ({ date, worked: false, did: "", professor: false, coworker: false, documented: false, clockedOut: false, energy: 3, mood: "🙂", notes: "" })),
      reflections: getWeekRanges(startDate, endDate).map(w => ({ id: w.id, range: `${w.start} – ${w.end}`, notes: "", collapsed: false }))
    },
    orchestration: {
      assignments: ["Week 0 / Assignment 0", "Assignment 1", "Assignment 2", "Assignment 3", "Assignment 4", "Assignment 5"].map(title => ({
        id: uid("asg"), title, classDate: "", dueDate: "", description: "", status: "Not Started",
        draftDone: false, orchestrationChecked: false, scoreCleaned: false, audioExportDone: false,
        pdfExportDone: false, emailWritten: false, emailSent: false, feedbackReceived: false, revisionNeeded: false, notes: ""
      }))
    },
    practice: {
      days: allDates.map((date, index) => ({ date, practiced: false, minutes: 0, emoji: PRACTICE_EMOJIS[index % PRACTICE_EMOJIS.length], note: "", detail: "", technique: false, repertoire: false, improvisation: false, sightReading: false, feeling: "" }))
    },
    compositions: {
      projects: [{
        id: uid("comp"), title: "well…哎…", instrumentation: "piano, violin, cello, clarinet",
        goal: "这个假期要改完、扩展完，并准备给乐器实录。", status: "In Progress", priority: "High",
        dueDate: "", notes: "", files: "", nextAction: "review existing material",
        tasks: COMPOSITION_STAGES.map(label => ({ id: uid("ctask"), label, done: false, status: "Not Started", note: "" })),
        journal: []
      }]
    },
    listening: {
      logs: [],
      composers: [
        {
          id: uid("composer"), name: "吉松隆 Takashi Yoshimatsu", bio: "", keywords: "",
          works: [
            ["昴星团舞曲集 / Pleiades Dances", "piece", "奇数拍乐句，旋律发展的落点，钢琴小品写作"],
            ["Fuzzy Bird Sonata", "piece", "和声，钢琴织体，律动，saxophone writing"],
            ["朱鹭的哀歌 / Threnody to Toki", "piece", "空间感，呼吸感，弦乐分层"],
            ["Piano Concerto “Memo Flora”", "piece", "结构设计，和声，钢琴华彩设计，配器"],
            ["Symphony No. 4", "piece", "乐章对比，metric modulation，lydian chromatic，曲式结构设计，配器"]
          ].map(w => createWork(w[0], "吉松隆 Takashi Yoshimatsu", w[1], w[2]))
        },
        {
          id: uid("composer"), name: "武满彻 Toru Takemitsu", bio: "", keywords: "",
          works: [
            ["Confronting Silence", "book / aesthetic source", "美学概念，沉默，声音，空间"],
            ["Rain Tree Sketch", "piece", "piano texture, resonance, form, title idea"],
            ["Distance de Fée", "piece", "短作品思维，结构，动机发展，标题取名"],
            ["Pause ininterrompue", "piece", "短作品思维结构，动机发展，标题取名"],
            ["Requiem", "piece", "弦乐队写作，和声，呼吸"],
            ["Dorian Horizon", "piece", "弦乐队写作，modal harmony, texture"],
            ["November Steps", "piece", "和声，配器，结构，东西方乐器关系"],
            ["A Flock Descends into the Pentagonal Garden", "piece", "哲学观念，和声结构，晚期作品"]
          ].map(w => createWork(w[0], "武满彻 Toru Takemitsu", w[1], w[2]))
        },
        { id: uid("composer"), name: "Other composers / listening", bio: "", keywords: "", works: [] }
      ]
    },
    workspace: {
      career: ["了解音乐领域不同工作", "game music", "composition grad school", "sound design", "musical theater", "research / cognitive science + music", "arts admin / festival / workshop / volunteer possibilities"].map(title => ({ id: uid("career"), title, status: "Not Started", notes: "", nextAction: "" })),
      weeklyAdmin: getWeekRanges(startDate, endDate).map(w => ({ id: w.id, range: `${w.start} – ${w.end}`, hoursLogged: false, notes: "", moneyNotes: "" })),
      vrNotes: "",
      vrTasks: ["collect papers", "summarize adult amblyopia VR treatment options", "write personal research questions", "think about self-treatment / training safely", "possible outreach / email list"].map(label => ({ id: uid("vrtask"), label, done: false, notes: "" })),
      blog: { ideas: "", topics: "", recording: false, editing: false, published: false, notes: "" },
      inbox: []
    },
    activityLog: []
  };
}

function createWork(title, composer, type, focus) {
  return { id: uid("work"), title, composer, type, status: "To Listen", listened: false, scoreStudied: false, notesTaken: false, analysisWritten: false, focus, listeningNotes: "", scoreAnalysis: "", steal: "", relatedIdea: "", rating: 3, lastTouched: "" };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    appData = raw ? JSON.parse(raw) : createSeedData();
  } catch {
    appData = createSeedData();
  }
  normalizeData();
  saveData(false);
}

function normalizeData() {
  appData.activityLog ||= [];
  appData.settings ||= { startDate: "2026-06-08", endDate: "2026-09-01", epTitle: "i feel..." };
}

function saveData(shouldRender = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  if (shouldRender) render();
}

function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveData(false), 250);
}

function logActivity(area, itemTitle, action) {
  appData.activityLog.unshift({ timestamp: new Date().toISOString(), area, itemTitle, action });
  appData.activityLog = appData.activityLog.slice(0, 80);
}

function exportData() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "summer-2026-plan-tracker.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.settings || !imported.ep || !imported.reading || !imported.practice) throw new Error("结构不完整");
      appData = imported;
      normalizeData();
      logActivity("System", "Import", "导入 JSON 数据");
      saveData(true);
    } catch (err) {
      alert(`导入失败：${err.message}`);
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("确定要重置为示例数据吗？当前数据会被覆盖。")) return;
  if (!confirm("请再次确认：这会清空当前 localStorage 里的计划数据。")) return;
  appData = createSeedData();
  logActivity("System", "Reset", "重置示例数据");
  saveData(true);
}

function progressBar(percent) {
  return `<div class="progress-wrap"><div class="progress-bar" style="width:${clampPercent(percent)}%"></div></div>`;
}

function optionList(options, selected) {
  return options.map(o => `<option value="${escapeHtml(o)}"${o === selected ? " selected" : ""}>${escapeHtml(o)}</option>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}

function getByPath(path) {
  return path.split(".").reduce((obj, key) => obj?.[key], appData);
}

function setByPath(path, value) {
  const parts = path.split(".");
  let obj = appData;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  obj[parts.at(-1)] = value;
}

function input(path, value, extra = "") {
  return `data-path="${path}" value="${escapeHtml(value)}" ${extra}`;
}

function textarea(path, value, extra = "") {
  return `<textarea data-path="${path}" ${extra}>${escapeHtml(value)}</textarea>`;
}

function select(path, value, options) {
  return `<select data-path="${path}">${optionList(options, value)}</select>`;
}

function checkbox(path, checked, label = "", extra = "") {
  return `<label class="check-item"><input type="checkbox" data-path="${path}" ${checked ? "checked" : ""} ${extra}>${label ? `<span>${escapeHtml(label)}</span>` : ""}</label>`;
}

function statusSummary(items, progress) {
  const done = items.filter(i => i.status === "Done").length;
  const doing = items.filter(i => i.status === "In Progress" || i.status === "Listening" || i.status === "Analyzing").length;
  const latest = appData.activityLog[0];
  const next = items.find(i => i.nextAction)?.nextAction || items.find(i => i.status !== "Done")?.title || "今天保持连接就好";
  return `<section class="summary-card">
    <div class="summary-row"><h2>小结</h2><span class="pill">${progress}%</span></div>
    ${progressBar(progress)}
    <div class="tag-row"><span class="pill">完成 ${done}</span><span class="pill">进行中 ${doing}</span><span class="pill">最近更新 ${latest ? formatDate(latest.timestamp.slice(0,10)) : "暂无"}</span></div>
    <p class="muted">下一步：${escapeHtml(next)}</p>
  </section>`;
}

function trackProgress(track) {
  return calculateCheckboxProgress(track.stages.map(s => s.done));
}
function assignmentProgress(a) {
  return calculateCheckboxProgress([a.draftDone, a.orchestrationChecked, a.scoreCleaned, a.audioExportDone, a.pdfExportDone, a.emailWritten, a.emailSent, a.feedbackReceived]);
}
function bookProgress(book) {
  if (Number(book.totalPages) > 0) return clampPercent((Number(book.currentPage || 0) / Number(book.totalPages)) * 100);
  return clampPercent(book.manualProgress || (book.status === "Done" ? 100 : 0));
}
function workProgress(work) {
  return calculateCheckboxProgress([work.listened, work.scoreStudied, work.notesTaken, work.analysisWritten]);
}
function compositionProgress(project) {
  return calculateCheckboxProgress(project.tasks.map(t => t.done));
}

function getTabProgress() {
  const epTasks = [...appData.ep.releaseChecklist.map(c => c.done), ...appData.ep.tracks.flatMap(t => t.stages.map(s => s.done))];
  const reading = calculateCheckboxProgress(appData.reading.days.map(d => d.read));
  const work = calculateCheckboxProgress(appData.work.days.flatMap(d => [d.worked, d.professor, d.coworker, d.documented, d.clockedOut]));
  const orch = calculateCheckboxProgress(appData.orchestration.assignments.flatMap(a => [a.draftDone, a.orchestrationChecked, a.scoreCleaned, a.audioExportDone, a.pdfExportDone, a.emailWritten, a.emailSent, a.feedbackReceived]));
  const practice = calculateCheckboxProgress(appData.practice.days.map(d => d.practiced));
  const comp = calculateCheckboxProgress(appData.compositions.projects.flatMap(p => p.tasks.map(t => t.done)));
  const listening = calculateCheckboxProgress(appData.listening.composers.flatMap(c => c.works.flatMap(w => [w.listened, w.scoreStudied, w.notesTaken, w.analysisWritten])));
  const workspace = calculateCheckboxProgress([
    ...appData.workspace.weeklyAdmin.map(w => w.hoursLogged),
    ...appData.workspace.vrTasks.map(t => t.done),
    appData.workspace.blog.recording, appData.workspace.blog.editing, appData.workspace.blog.published
  ]);
  return { ep: calculateCheckboxProgress(epTasks), reading, work, orchestration: orch, practice, composition: comp, listening, workspace };
}

function getOverallProgress() {
  const p = getTabProgress();
  const weights = { ep: 1.5, composition: 1.3, orchestration: 1.2, reading: 1, work: 1, practice: 1, listening: 1, workspace: 1 };
  const sum = Object.entries(weights).reduce((acc, [key, weight]) => acc + p[key] * weight, 0);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return clampPercent(sum / total);
}

function renderShell() {
  document.getElementById("tabNav").innerHTML = TABS.map(([id, label]) => `<button class="tab-btn ${id === activeTab ? "active" : ""}" data-tab="${id}">${label}</button>`).join("");
  const today = getTodayInRange();
  const dates = getDateRange(appData.settings.startDate, appData.settings.endDate);
  const todayIndex = dates.indexOf(today.today);
  const dayLabel = today.inRange ? `第 ${todayIndex + 1} 天 / 剩 ${dates.length - todayIndex - 1} 天` : today.label;
  const overall = getOverallProgress();
  document.getElementById("todayLabel").textContent = today.inRange ? today.label : formatDate(today.today);
  document.getElementById("dayCountLabel").textContent = dayLabel;
  document.getElementById("overallLabel").textContent = `${overall}%`;
  document.getElementById("overallBar").style.width = `${overall}%`;
  document.getElementById("encouragement").textContent = ENCOURAGEMENTS[Math.floor(new Date().getDate() % ENCOURAGEMENTS.length)];
}

function render() {
  renderShell();
  const routes = { dashboard: renderDashboard, ep: renderEP, reading: renderReading, work: renderWork, orchestration: renderOrchestration, practice: renderPractice, composition: renderComposition, listening: renderListening, workspace: renderWorkspace };
  document.getElementById("app").innerHTML = routes[activeTab]();
}

function renderDashboard() {
  const p = getTabProgress();
  const overall = getOverallProgress();
  const dates = getDateRange(appData.settings.startDate, appData.settings.endDate);
  const today = getTodayInRange();
  const timeProgress = today.today < appData.settings.startDate ? 0 : today.today > appData.settings.endDate ? 100 : clampPercent(((dates.indexOf(today.today) + 1) / dates.length) * 100);
  const cards = [
    ["ep", "EP 制作", appData.ep.tracks, "tracks"], ["reading", "阅读", appData.reading.books, "books"],
    ["work", "工作", appData.work.days, "days"], ["orchestration", "管弦乐课", appData.orchestration.assignments, "assignments"],
    ["practice", "每日练琴", appData.practice.days, "days"], ["composition", "作曲计划", appData.compositions.projects, "projects"],
    ["listening", "作曲家 / 听歌分析", appData.listening.composers.flatMap(c => c.works), "works"], ["workspace", "未来规划 & Workspace", appData.workspace.career, "items"]
  ];
  const todayRead = appData.reading.days.find(d => d.date === today.today);
  const todayPractice = appData.practice.days.find(d => d.date === today.today);
  const todayWork = appData.work.days.find(d => d.date === today.today);
  const weeks = getWeekRanges(appData.settings.startDate, appData.settings.endDate);
  return `
    <section class="summary-card"><div class="summary-row"><h2>Overall Progress</h2><strong>${overall}%</strong></div>${progressBar(overall)}
      <p class="muted">暑假时间进度：${timeProgress}% (${dates.length} 天)</p>${progressBar(timeProgress)}</section>
    <section class="grid cols-4">${cards.map(([key, title, items, unit]) => {
      const recent = appData.activityLog.find(a => a.area.includes(title) || a.area.includes(key));
      const done = key === "reading" ? appData.reading.days.filter(d => d.read).length : key === "practice" ? appData.practice.days.filter(d => d.practiced).length : items.filter(i => i.status === "Done" || i.done || i.worked).length;
      const next = items.find(i => i.nextAction)?.nextAction || items.find(i => i.status !== "Done")?.title || "轻轻碰一下";
      return `<article class="card"><div class="summary-row"><h3>${title}</h3><span class="pill">${p[key]}%</span></div>${progressBar(p[key])}<p>${done} / ${items.length} ${unit}</p><p class="muted">Next: ${escapeHtml(next)}</p><p class="muted">Note: ${recent ? escapeHtml(recent.action) : "暂无最近记录"}</p></article>`;
    }).join("")}</section>
    <section class="panel"><h2>Today</h2><p class="muted">${today.inRange ? "今天也可以只做一点点。" : "不在计划日期范围内，但仍可记录灵感。"}</p>
      <div class="check-list">
        ${checkbox(todayRead ? `reading.days.${appData.reading.days.indexOf(todayRead)}.read` : "", todayRead?.read, "今天是否阅读", todayRead ? "" : "disabled")}
        ${checkbox(todayPractice ? `practice.days.${appData.practice.days.indexOf(todayPractice)}.practiced` : "", todayPractice?.practiced, "今天是否练琴", todayPractice ? "" : "disabled")}
        ${checkbox(todayWork ? `work.days.${appData.work.days.indexOf(todayWork)}.worked` : "", todayWork?.worked, "今天是否工作记录", todayWork ? "" : "disabled")}
        <label class="check-item"><input type="checkbox" data-action="quick-log" data-area="听歌分析">今天是否听 / 分析音乐</label>
        <label class="check-item"><input type="checkbox" data-action="quick-log" data-area="写一点点东西">今天是否写一点点东西</label>
      </div></section>
    <section class="panel"><h2>Weekly rhythm</h2><div class="heatmap">${weeks.map(w => {
      const values = w.dates.map(date => {
        const r = appData.reading.days.find(d => d.date === date)?.read;
        const pr = appData.practice.days.find(d => d.date === date)?.practiced;
        const wo = appData.work.days.find(d => d.date === date)?.worked;
        return [r, pr, wo].filter(Boolean).length / 3;
      });
      const pct = clampPercent((values.reduce((a,b)=>a+b,0) / values.length) * 100);
      return `<div class="day-cell ${pct > 40 ? "done" : ""}"><strong>${w.start.slice(5)} – ${w.end.slice(5)}</strong>${progressBar(pct)}<small>${pct}%</small></div>`;
    }).join("")}</div></section>
    <section class="panel"><h2>Things I touched recently</h2><div class="list">${appData.activityLog.slice(0,5).map(a => `<div class="card-row"><span>${escapeHtml(a.area)} · ${escapeHtml(a.itemTitle)}</span><small>${new Date(a.timestamp).toLocaleString("zh-CN")}</small><span class="muted">${escapeHtml(a.action)}</span></div>`).join("") || "<p class='muted'>还没有修改记录。</p>"}</div></section>
  `;
}

function renderEP() {
  const p = getTabProgress().ep;
  const statusFilter = appData.ep.statusFilter || "All";
  const typeFilter = appData.ep.typeFilter || "All";
  const tracks = appData.ep.tracks.filter(t => (statusFilter === "All" || t.status === statusFilter) && (typeFilter === "All" || t.type === typeFilter));
  return `
    ${statusSummary(appData.ep.tracks, p)}
    <section class="panel"><div class="summary-row"><h2>EP overall</h2><strong>${appData.settings.epTitle}</strong></div>
      <div class="form-grid">
        <div class="field"><label>EP title</label><input ${input("settings.epTitle", appData.settings.epTitle)}></div>
        <div class="field"><label>References</label>${textarea("settings.references", appData.settings.references)}</div>
        <div class="field"><label>Concept / keywords</label>${textarea("settings.concept", appData.settings.concept)}</div>
        <div class="field"><label>Sonic palette</label>${textarea("settings.sonicPalette", appData.settings.sonicPalette)}</div>
      </div>
      <h3>Release prep checklist</h3><div class="check-list">${appData.ep.releaseChecklist.map((c,i)=>checkbox(`ep.releaseChecklist.${i}.done`, c.done, c.label)).join("")}</div>
    </section>
    <section class="panel"><div class="summary-row"><h2>Track order</h2><button class="btn" data-action="add-track">Add new track</button></div>
      <div class="form-grid"><div class="field"><label>Status filter</label><select data-path="ep.statusFilter"><option>All</option>${optionList(STATUSES, statusFilter)}</select></div><div class="field"><label>Type filter</label><select data-path="ep.typeFilter"><option>All</option>${optionList(["Intro","Song","Interlude","Outro"], typeFilter)}</select></div></div>
      <div class="list">${tracks.map(t => renderTrackCard(t, appData.ep.tracks.indexOf(t))).join("")}</div></section>
    <section class="panel"><h2>Stage matrix</h2><div class="matrix-wrap"><table class="matrix"><thead><tr><th>Track</th>${STAGE_NAMES.map(s=>`<th>${escapeHtml(s)}</th>`).join("")}</tr></thead><tbody>
      ${appData.ep.tracks.map((t,ti)=>`<tr><td>${escapeHtml(t.title)}<br><small>${trackProgress(t)}%</small></td>${t.stages.map((s,si)=>`<td><input type="checkbox" data-path="ep.tracks.${ti}.stages.${si}.done" ${s.done ? "checked" : ""}></td>`).join("")}</tr>`).join("")}
    </tbody></table></div></section>`;
}

function renderTrackCard(t, i) {
  return `<article class="card">
    <div class="summary-row"><h3>${escapeHtml(t.title)}</h3><span class="pill">${trackProgress(t)}%</span></div>${progressBar(trackProgress(t))}
    <div class="tag-row"><button class="btn" data-action="toggle-track" data-index="${i}">${t.expanded ? "收起" : "展开"}</button><button class="btn" data-action="duplicate-track" data-index="${i}">Duplicate track</button><button class="btn danger" data-action="delete-track" data-index="${i}">Delete track</button></div>
    <div class="${t.expanded ? "" : "hidden"}">
      <div class="form-grid">
        <div class="field"><label>Track title</label><input ${input(`ep.tracks.${i}.title`, t.title)}></div>
        <div class="field"><label>Type</label>${select(`ep.tracks.${i}.type`, t.type, ["Intro","Song","Interlude","Outro"])}</div>
        <div class="field"><label>Mood</label><input ${input(`ep.tracks.${i}.mood`, t.mood)}></div>
        <div class="field"><label>BPM</label><input type="number" ${input(`ep.tracks.${i}.bpm`, t.bpm)}></div>
        <div class="field"><label>Key / tonal center</label><input ${input(`ep.tracks.${i}.key`, t.key)}></div>
        <div class="field"><label>Current status</label>${select(`ep.tracks.${i}.status`, t.status, STATUSES)}</div>
        <div class="field"><label>Main idea</label>${textarea(`ep.tracks.${i}.mainIdea`, t.mainIdea)}</div>
        <div class="field"><label>Reference tracks</label>${textarea(`ep.tracks.${i}.references`, t.references)}</div>
        <div class="field"><label>Notes</label>${textarea(`ep.tracks.${i}.notes`, t.notes)}</div>
      </div>
      <h3>Stage checklist</h3><div class="check-list">${t.stages.map((s,si)=>checkbox(`ep.tracks.${i}.stages.${si}.done`, s.done, s.label)).join("")}</div>
    </div></article>`;
}

function renderReading() {
  const days = appData.reading.days;
  const streak = calculateStreak(days, "read");
  const totalMinutes = days.reduce((sum, d) => sum + Number(d.minutes || 0), 0);
  const filter = appData.reading.filter || "All";
  const books = appData.reading.books.filter(b => filter === "All" || b.status === filter);
  return `${statusSummary(appData.reading.books, getTabProgress().reading)}
    <section class="grid cols-4">
      <div class="stat"><strong>${streak.current}</strong><small>reading streak</small></div><div class="stat"><strong>${days.filter(d=>d.read).length}</strong><small>total reading days</small></div><div class="stat"><strong>${totalMinutes}</strong><small>total minutes</small></div><div class="stat"><strong>${appData.reading.books.filter(b=>b.status==="Done").length}</strong><small>finished books</small></div>
    </section>
    <section class="panel"><div class="summary-row"><h2>Books</h2><button class="btn" data-action="add-book">Add book</button></div><p class="muted">今天要不要读 10 分钟就算赢。</p>
      <div class="field"><label>Filter by status</label><select data-path="reading.filter"><option>All</option>${optionList(STATUSES, filter)}</select></div>
      <div class="grid cols-3">${books.map(b => renderBook(b, appData.reading.books.indexOf(b))).join("")}</div></section>
    <section class="panel"><h2>Daily reading calendar</h2><div class="calendar">${days.map((d,i)=>`<div class="day-cell ${d.read ? "done" : ""}"><div class="summary-row"><span class="date-num">${d.date.slice(5)}</span><input type="checkbox" data-path="reading.days.${i}.read" ${d.read ? "checked" : ""}></div><input class="tiny-input" type="number" placeholder="分钟" data-path="reading.days.${i}.minutes" value="${escapeHtml(d.minutes)}"><input class="tiny-input" placeholder="书名" data-path="reading.days.${i}.book" value="${escapeHtml(d.book)}"><textarea class="tiny-note" placeholder="一句 note / quote" data-path="reading.days.${i}.note">${escapeHtml(d.note)}</textarea></div>`).join("")}</div></section>`;
}

function renderBook(b, i) {
  return `<article class="card"><div class="summary-row"><h3>${escapeHtml(b.title)}</h3><span class="pill">${bookProgress(b)}%</span></div>${progressBar(bookProgress(b))}
    <p class="muted">${escapeHtml(b.author)} · ${escapeHtml(b.category)}</p>
    <div class="form-grid">
      <div class="field"><label>priority</label>${select(`reading.books.${i}.priority`, b.priority, PRIORITIES)}</div>
      <div class="field"><label>status</label>${select(`reading.books.${i}.status`, b.status, STATUSES)}</div>
      <div class="field"><label>current page</label><input type="number" ${input(`reading.books.${i}.currentPage`, b.currentPage)}></div>
      <div class="field"><label>total pages</label><input type="number" ${input(`reading.books.${i}.totalPages`, b.totalPages)}></div>
      <div class="field"><label>manual progress</label><input type="range" min="0" max="100" ${input(`reading.books.${i}.manualProgress`, b.manualProgress)}></div>
      <div class="field"><label>finish date</label><input type="date" ${input(`reading.books.${i}.finishDate`, b.finishDate)}></div>
    </div>
    <div class="field"><label>notes</label>${textarea(`reading.books.${i}.notes`, b.notes)}</div>
    <div class="field"><label>key takeaways</label>${textarea(`reading.books.${i}.takeaways`, b.takeaways)}</div>
    <button class="btn" data-action="finish-book" data-index="${i}">Mark as finished</button></article>`;
}

function renderWork() {
  const days = appData.work.days;
  const avg = days.filter(d=>d.worked).length ? (days.filter(d=>d.worked).reduce((s,d)=>s+Number(d.energy||0),0)/days.filter(d=>d.worked).length).toFixed(1) : "0";
  const weeks = getWeekRanges(appData.settings.startDate, appData.settings.endDate);
  return `${statusSummary(days.map(d=>({status:d.worked?"Done":"Not Started", title:d.date})), getTabProgress().work)}
    <section class="grid cols-4"><div class="stat"><strong>${days.filter(d=>d.worked).length}</strong><small>worked days</small></div><div class="stat"><strong>${days.filter(d=>d.professor).length}</strong><small>professor updates</small></div><div class="stat"><strong>${days.filter(d=>d.coworker).length}</strong><small>coworker checkins</small></div><div class="stat"><strong>${avg}</strong><small>average energy</small></div></section>
    <section class="panel"><h2>Workday log</h2><div class="list">${weeks.map(w => {
      const reflectionIndex = appData.work.reflections.findIndex(r => r.id === w.id);
      const ref = appData.work.reflections[reflectionIndex];
      const entries = days.filter(d => d.date >= w.start && d.date <= w.end);
      return `<article class="card"><div class="summary-row"><h3>${w.start} – ${w.end}</h3><button class="btn" data-action="toggle-reflection" data-index="${reflectionIndex}">${ref?.collapsed ? "展开" : "折叠"}</button></div><div class="${ref?.collapsed ? "hidden" : ""}">${entries.map(d => renderWorkDay(d, days.indexOf(d))).join("")}<div class="field"><label>weekly reflection</label>${textarea(`work.reflections.${reflectionIndex}.notes`, ref?.notes || "")}</div></div></article>`;
    }).join("")}</div></section>`;
}

function renderWorkDay(d, i) {
  return `<div class="card"><div class="summary-row"><strong>${formatDate(d.date)}</strong><span>${dayOfWeek(d.date)}</span></div>
    <div class="check-list">${checkbox(`work.days.${i}.worked`, d.worked, "Worked today")}${checkbox(`work.days.${i}.professor`, d.professor, "Professor update")}${checkbox(`work.days.${i}.coworker`, d.coworker, "Coworker check-in")}${checkbox(`work.days.${i}.documented`, d.documented, "Logged progress")}${checkbox(`work.days.${i}.clockedOut`, d.clockedOut, d.clockedOut ? "恭喜顺利下班 🎉" : "顺利下班")}</div>
    <div class="form-grid"><div class="field"><label>Energy level 1-5</label><input type="number" min="1" max="5" ${input(`work.days.${i}.energy`, d.energy)}></div><div class="field"><label>Mood emoji</label><select data-path="work.days.${i}.mood">${optionList(["🙂","😌","🥱","🤔","✨"], d.mood)}</select></div></div>
    <div class="field"><label>What I did today</label>${textarea(`work.days.${i}.did`, d.did)}</div><div class="field"><label>Notes</label>${textarea(`work.days.${i}.notes`, d.notes)}</div></div>`;
}

function renderOrchestration() {
  return `${statusSummary(appData.orchestration.assignments, getTabProgress().orchestration)}
    <section class="panel"><div class="summary-row"><h2>Assignments</h2><button class="btn" data-action="add-assignment">Add assignment</button></div><div class="grid cols-2">${appData.orchestration.assignments.map((a,i)=>`<article class="card"><div class="summary-row"><h3>${escapeHtml(a.title)}</h3><span class="pill">${assignmentProgress(a)}%</span></div>${progressBar(assignmentProgress(a))}
      <p class="pill">${a.pdfExportDone && a.audioExportDone && a.emailWritten ? "Email ready" : "Email not ready"}</p>
      <div class="form-grid"><div class="field"><label>title</label><input ${input(`orchestration.assignments.${i}.title`, a.title)}></div><div class="field"><label>status</label>${select(`orchestration.assignments.${i}.status`, a.status, STATUSES)}</div><div class="field"><label>class date</label><input type="date" ${input(`orchestration.assignments.${i}.classDate`, a.classDate)}></div><div class="field"><label>due date</label><input type="date" ${input(`orchestration.assignments.${i}.dueDate`, a.dueDate)}></div></div>
      <div class="field"><label>task description</label>${textarea(`orchestration.assignments.${i}.description`, a.description)}</div>
      <div class="check-list">${[
        ["draftDone","draft done"],["orchestrationChecked","orchestration checked"],["scoreCleaned","score cleaned"],["audioExportDone","audio export done"],["pdfExportDone","PDF export done"],["emailWritten","email written"],["emailSent","email sent to teacher"],["feedbackReceived","feedback received"],["revisionNeeded","revision needed"]
      ].map(([k,l])=>checkbox(`orchestration.assignments.${i}.${k}`, a[k], l)).join("")}</div>
      <div class="field"><label>notes</label>${textarea(`orchestration.assignments.${i}.notes`, a.notes)}</div></article>`).join("")}</div></section>`;
}

function renderPractice() {
  const days = appData.practice.days;
  const streak = calculateStreak(days, "practiced");
  return `${statusSummary(days.map(d=>({status:d.practiced?"Done":"Not Started", title:d.date})), getTabProgress().practice)}
    <section class="grid cols-4"><div class="stat"><strong>${days.filter(d=>d.practiced).length}</strong><small>total practice days</small></div><div class="stat"><strong>${streak.current}</strong><small>current streak</small></div><div class="stat"><strong>${streak.longest}</strong><small>longest streak</small></div><div class="stat"><strong>${days.reduce((s,d)=>s+Number(d.minutes||0),0)}</strong><small>total minutes</small></div></section>
    <section class="panel"><h2>Practice calendar</h2><div class="calendar">${days.map((d,i)=>`<div class="day-cell ${d.practiced ? "done" : ""}" data-action="open-practice" data-index="${i}"><div class="summary-row"><span class="date-num">${d.date.slice(5)}</span><span>${d.emoji}</span></div><label><input type="checkbox" data-path="practice.days.${i}.practiced" ${d.practiced ? "checked" : ""}> practiced</label><input class="tiny-input" type="number" placeholder="分钟" data-path="practice.days.${i}.minutes" value="${escapeHtml(d.minutes)}"><textarea class="tiny-note" placeholder="note" data-path="practice.days.${i}.note">${escapeHtml(d.note)}</textarea></div>`).join("")}</div></section>`;
}

function renderComposition() {
  const p = getTabProgress().composition;
  const high = appData.compositions.projects.filter(p => p.priority === "High").map(p => `${p.title}: ${p.nextAction || "写一个下一步"}`);
  return `${statusSummary(appData.compositions.projects, p)}
    <section class="panel"><div class="summary-row"><h2>High priority next actions</h2><button class="btn" data-action="add-composition">Add composition project</button></div><div class="tag-row">${high.map(h=>`<span class="pill">${escapeHtml(h)}</span>`).join("")}</div></section>
    <section class="grid cols-2">${appData.compositions.projects.map((pr,i)=>`<article class="card"><div class="summary-row"><h3>${escapeHtml(pr.title)}</h3><span class="pill">${compositionProgress(pr)}%</span></div>${progressBar(compositionProgress(pr))}
      <div class="form-grid"><div class="field"><label>title</label><input ${input(`compositions.projects.${i}.title`, pr.title)}></div><div class="field"><label>status</label>${select(`compositions.projects.${i}.status`, pr.status, STATUSES)}</div><div class="field"><label>priority</label>${select(`compositions.projects.${i}.priority`, pr.priority, PRIORITIES)}</div><div class="field"><label>due date</label><input type="date" ${input(`compositions.projects.${i}.dueDate`, pr.dueDate)}></div></div>
      <div class="field"><label>instrumentation</label><input ${input(`compositions.projects.${i}.instrumentation`, pr.instrumentation)}></div><div class="field"><label>goal</label>${textarea(`compositions.projects.${i}.goal`, pr.goal)}</div><div class="field"><label>linked files / sketches</label><input ${input(`compositions.projects.${i}.files`, pr.files)}></div><div class="field"><label>next action</label><input ${input(`compositions.projects.${i}.nextAction`, pr.nextAction)}></div>
      <h3>Task tracker</h3><div class="list">${pr.tasks.map((t,ti)=>`<div class="check-item"><input type="checkbox" data-path="compositions.projects.${i}.tasks.${ti}.done" ${t.done ? "checked" : ""}><input class="tiny-input" data-path="compositions.projects.${i}.tasks.${ti}.label" value="${escapeHtml(t.label)}"><select data-path="compositions.projects.${i}.tasks.${ti}.status">${optionList(STATUSES, t.status)}</select><input class="tiny-input" placeholder="note" data-path="compositions.projects.${i}.tasks.${ti}.note" value="${escapeHtml(t.note)}"></div>`).join("")}</div>
      <button class="btn" data-action="add-composition-task" data-index="${i}">Add custom task</button>
      <div class="field"><label>process journal</label>${textarea(`compositions.projects.${i}.notes`, pr.notes)}</div>
      <div class="summary-row"><button class="btn" data-action="add-journal" data-index="${i}">Add journal entry</button></div>
      <div class="list">${pr.journal.map((j,ji)=>`<div class="card-row"><input type="date" data-path="compositions.projects.${i}.journal.${ji}.date" value="${escapeHtml(j.date)}"><input data-path="compositions.projects.${i}.journal.${ji}.content" value="${escapeHtml(j.content)}"></div>`).join("")}</div></article>`).join("")}</section>`;
}

function renderListening() {
  const filterComposer = appData.listening.filterComposer || "All";
  const filterStatus = appData.listening.filterStatus || "All";
  const filterTag = (appData.listening.filterTag || "").toLowerCase();
  const allWorks = appData.listening.composers.flatMap((c, ci) => c.works.map((w, wi) => ({...w, ci, wi})));
  const works = allWorks.filter(w => (filterComposer === "All" || w.composer === filterComposer) && (filterStatus === "All" || w.status === filterStatus) && (!filterTag || w.focus.toLowerCase().includes(filterTag)));
  const steals = allWorks.filter(w => w.steal).map(w => `${w.title}: ${w.steal}`);
  return `${statusSummary(allWorks, getTabProgress().listening)}
    <section class="panel"><h2>Composer sections</h2>${appData.listening.composers.map((c,ci)=>`<article class="card"><div class="summary-row"><h3>${escapeHtml(c.name)}</h3><button class="btn" data-action="add-work" data-index="${ci}">add work</button></div><div class="form-grid"><div class="field"><label>biography / life notes</label>${textarea(`listening.composers.${ci}.bio`, c.bio)}</div><div class="field"><label>aesthetic keywords</label>${textarea(`listening.composers.${ci}.keywords`, c.keywords)}</div></div><p class="muted">listening progress ${calculateCheckboxProgress(c.works.map(w=>w.listened))}% · analysis progress ${calculateCheckboxProgress(c.works.map(w=>w.analysisWritten))}%</p></article>`).join("")}</section>
    <section class="panel"><div class="summary-row"><h2>Work cards</h2><button class="btn" data-action="add-listening-log">Listening log +</button></div>
      <div class="form-grid"><div class="field"><label>composer</label><select data-path="listening.filterComposer"><option>All</option>${optionList(appData.listening.composers.map(c=>c.name), filterComposer)}</select></div><div class="field"><label>status</label><select data-path="listening.filterStatus"><option>All</option>${optionList(["To Listen","Listening","Analyzing","Done"], filterStatus)}</select></div><div class="field"><label>tag</label><input data-path="listening.filterTag" value="${escapeHtml(appData.listening.filterTag || "")}"></div></div>
      <div class="grid cols-2">${works.map(w=>renderWorkCard(w)).join("")}</div></section>
    <section class="panel"><h2>Things to steal lovingly</h2><div class="list">${steals.map(s=>`<p class="card">${escapeHtml(s)}</p>`).join("") || "<p class='muted'>还没有记录可学习技法。</p>"}</div></section>
    <section class="panel"><h2>Listening log</h2><div class="list">${appData.listening.logs.map((l,i)=>`<div class="card-row"><input type="date" data-path="listening.logs.${i}.date" value="${escapeHtml(l.date)}"><input data-path="listening.logs.${i}.title" value="${escapeHtml(l.title)}"><input data-path="listening.logs.${i}.note" value="${escapeHtml(l.note)}"></div>`).join("")}</div></section>`;
}

function renderWorkCard(w) {
  const base = `listening.composers.${w.ci}.works.${w.wi}`;
  return `<article class="card"><div class="summary-row"><h3>${escapeHtml(w.title)}</h3><span class="pill">${workProgress(w)}%</span></div>${progressBar(workProgress(w))}
    <p class="muted">${escapeHtml(w.composer)} · ${escapeHtml(w.focus)}</p>
    <div class="form-grid"><div class="field"><label>type</label><input ${input(`${base}.type`, w.type)}></div><div class="field"><label>status</label>${select(`${base}.status`, w.status, ["To Listen","Listening","Analyzing","Done"])}</div><div class="field"><label>rating / inspiration</label><input type="number" min="1" max="5" ${input(`${base}.rating`, w.rating)}></div><div class="field"><label>date last touched</label><input type="date" ${input(`${base}.lastTouched`, w.lastTouched)}></div></div>
    <div class="check-list">${checkbox(`${base}.listened`, w.listened, "listened")}${checkbox(`${base}.scoreStudied`, w.scoreStudied, "score studied")}${checkbox(`${base}.notesTaken`, w.notesTaken, "notes taken")}${checkbox(`${base}.analysisWritten`, w.analysisWritten, "analysis written")}</div>
    <div class="field"><label>listening notes</label>${textarea(`${base}.listeningNotes`, w.listeningNotes)}</div><div class="field"><label>score analysis</label>${textarea(`${base}.scoreAnalysis`, w.scoreAnalysis)}</div><div class="field"><label>things to steal / learn</label>${textarea(`${base}.steal`, w.steal)}</div><div class="field"><label>related composition idea</label>${textarea(`${base}.relatedIdea`, w.relatedIdea)}</div></article>`;
}

function renderWorkspace() {
  return `${statusSummary(appData.workspace.career, getTabProgress().workspace)}
    <section class="panel"><h2>Future Career Exploration</h2><div class="grid cols-2">${appData.workspace.career.map((c,i)=>`<article class="card"><h3>${escapeHtml(c.title)}</h3><div class="field"><label>status</label>${select(`workspace.career.${i}.status`, c.status, STATUSES)}</div><div class="field"><label>next action</label><input ${input(`workspace.career.${i}.nextAction`, c.nextAction)}></div><div class="field"><label>notes</label>${textarea(`workspace.career.${i}.notes`, c.notes)}</div></article>`).join("")}</div></section>
    <section class="panel"><h2>Weekly Admin</h2><div class="grid cols-2">${appData.workspace.weeklyAdmin.map((w,i)=>`<article class="card"><h3>${w.range}</h3>${checkbox(`workspace.weeklyAdmin.${i}.hoursLogged`, w.hoursLogged, "Workday 每周 log hours")}<div class="field"><label>notes</label>${textarea(`workspace.weeklyAdmin.${i}.notes`, w.notes)}</div><div class="field"><label>money / paycheck notes</label>${textarea(`workspace.weeklyAdmin.${i}.moneyNotes`, w.moneyNotes)}</div></article>`).join("")}</div></section>
    <section class="panel"><h2>VR / Amblyopia Research</h2><div class="field"><label>open notes</label>${textarea("workspace.vrNotes", appData.workspace.vrNotes)}</div><div class="list">${appData.workspace.vrTasks.map((t,i)=>`<div class="check-item"><input type="checkbox" data-path="workspace.vrTasks.${i}.done" ${t.done ? "checked" : ""}><span>${escapeHtml(t.label)}</span><input class="tiny-input" placeholder="notes" data-path="workspace.vrTasks.${i}.notes" value="${escapeHtml(t.notes)}"></div>`).join("")}</div></section>
    <section class="panel"><h2>Blog / Creative documentation</h2><div class="check-list">${checkbox("workspace.blog.recording", appData.workspace.blog.recording, "recording")}${checkbox("workspace.blog.editing", appData.workspace.blog.editing, "editing")}${checkbox("workspace.blog.published", appData.workspace.blog.published, "published/shared")}</div><div class="form-grid"><div class="field"><label>idea list</label>${textarea("workspace.blog.ideas", appData.workspace.blog.ideas)}</div><div class="field"><label>possible episode / post topics</label>${textarea("workspace.blog.topics", appData.workspace.blog.topics)}</div><div class="field"><label>notes</label>${textarea("workspace.blog.notes", appData.workspace.blog.notes)}</div></div></section>
    <section class="panel"><div class="summary-row"><h2>Open Inbox</h2><button class="btn" data-action="add-inbox">快速添加</button></div><div class="list">${appData.workspace.inbox.map((it,i)=>`<div class="card"><div class="form-grid"><div class="field"><label>category</label><input ${input(`workspace.inbox.${i}.category`, it.category)}></div><div class="field"><label>status</label>${select(`workspace.inbox.${i}.status`, it.status, STATUSES)}</div></div><div class="field"><label>note</label>${textarea(`workspace.inbox.${i}.note`, it.note)}</div><button class="btn danger" data-action="archive-inbox" data-index="${i}">archive done item</button></div>`).join("")}</div></section>`;
}

function openPracticeModal(index) {
  const d = appData.practice.days[index];
  document.getElementById("modalBody").innerHTML = `<h2>${formatDate(d.date)} ${d.emoji}</h2>
    <div class="field"><label>今天练了什么</label>${textarea(`practice.days.${index}.detail`, d.detail)}</div>
    <div class="check-list">${checkbox(`practice.days.${index}.technique`, d.technique, "技术")}${checkbox(`practice.days.${index}.repertoire`, d.repertoire, "曲目")}${checkbox(`practice.days.${index}.improvisation`, d.improvisation, "即兴")}${checkbox(`practice.days.${index}.sightReading`, d.sightReading, "sight-reading")}</div>
    <div class="field"><label>感觉如何</label>${textarea(`practice.days.${index}.feeling`, d.feeling)}</div>`;
  document.getElementById("modal").classList.remove("hidden");
}

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-tab]");
  if (tab) { activeTab = tab.dataset.tab; render(); return; }
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === "close-modal") document.getElementById("modal").classList.add("hidden");
  if (action === "add-track") { appData.ep.tracks.push({ id: uid("track"), title: "New Track", type: "Song", mood: "", bpm: "", key: "", mainIdea: "", references: "", status: "Not Started", notes: "", expanded: true, stages: buildChecklist(STAGE_NAMES) }); logActivity("EP 制作", "New Track", "新增 track"); saveData(true); }
  if (action === "toggle-track") { const t = appData.ep.tracks[actionEl.dataset.index]; t.expanded = !t.expanded; saveData(true); }
  if (action === "duplicate-track") { const src = appData.ep.tracks[actionEl.dataset.index]; appData.ep.tracks.splice(Number(actionEl.dataset.index)+1, 0, JSON.parse(JSON.stringify({...src, id: uid("track"), title: `${src.title} copy`}))); logActivity("EP 制作", src.title, "复制 track"); saveData(true); }
  if (action === "delete-track" && confirm("确定删除这个 track 吗？")) { const [t] = appData.ep.tracks.splice(actionEl.dataset.index, 1); logActivity("EP 制作", t.title, "删除 track"); saveData(true); }
  if (action === "add-book") { appData.reading.books.push({ id: uid("book"), title: "New Book", author: "", category: "", priority: "Medium", status: "Not Started", currentPage: 0, totalPages: "", manualProgress: 0, startDate: "", finishDate: "", notes: "", takeaways: "", related: "" }); saveData(true); }
  if (action === "finish-book") { const b = appData.reading.books[actionEl.dataset.index]; b.status = "Done"; b.finishDate = new Date().toISOString().slice(0,10); b.manualProgress = 100; logActivity("阅读", b.title, "标记完成"); saveData(true); }
  if (action === "toggle-reflection") { const r = appData.work.reflections[actionEl.dataset.index]; r.collapsed = !r.collapsed; saveData(true); }
  if (action === "add-assignment") { appData.orchestration.assignments.push({ id: uid("asg"), title: "New Assignment", classDate: "", dueDate: "", description: "", status: "Not Started", draftDone: false, orchestrationChecked: false, scoreCleaned: false, audioExportDone: false, pdfExportDone: false, emailWritten: false, emailSent: false, feedbackReceived: false, revisionNeeded: false, notes: "" }); saveData(true); }
  if (action === "open-practice" && !event.target.dataset.path) openPracticeModal(actionEl.dataset.index);
  if (action === "add-composition") { appData.compositions.projects.push({ id: uid("comp"), title: "New composition", instrumentation: "", goal: "", status: "Not Started", priority: "Medium", dueDate: "", notes: "", files: "", nextAction: "", tasks: COMPOSITION_STAGES.map(label => ({ id: uid("ctask"), label, done: false, status: "Not Started", note: "" })), journal: [] }); saveData(true); }
  if (action === "add-composition-task") { appData.compositions.projects[actionEl.dataset.index].tasks.push({ id: uid("ctask"), label: "custom task", done: false, status: "Not Started", note: "" }); saveData(true); }
  if (action === "add-journal") { appData.compositions.projects[actionEl.dataset.index].journal.push({ date: new Date().toISOString().slice(0,10), content: "" }); saveData(true); }
  if (action === "add-work") { const c = appData.listening.composers[actionEl.dataset.index]; c.works.push(createWork("New work", c.name, "piece", "")); saveData(true); }
  if (action === "add-listening-log") { appData.listening.logs.unshift({ date: new Date().toISOString().slice(0,10), title: "", note: "" }); saveData(true); }
  if (action === "add-inbox") { appData.workspace.inbox.unshift({ category: "capture", status: "Not Started", note: "" }); saveData(true); }
  if (action === "archive-inbox") { appData.workspace.inbox.splice(actionEl.dataset.index, 1); saveData(true); }
  if (action === "quick-log") { logActivity("总览", actionEl.dataset.area, "Today panel quick check"); saveData(true); }
});

document.addEventListener("change", event => {
  const el = event.target;
  if (!el.dataset.path) return;
  const value = el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? Number(el.value) : el.value;
  setByPath(el.dataset.path, value);
  const label = el.closest(".card, .day-cell, .panel")?.querySelector("h3, h2, .date-num")?.textContent || activeTab;
  logActivity(activeTab, label, `${el.type === "checkbox" ? "勾选更新" : "字段更新"} ${el.dataset.path.split(".").slice(-1)[0]}`);
  saveData(true);
});

document.addEventListener("input", event => {
  const el = event.target;
  if (!el.dataset.path || el.type === "checkbox") return;
  const value = el.type === "number" || el.type === "range" ? Number(el.value) : el.value;
  setByPath(el.dataset.path, value);
  logActivity(activeTab, el.dataset.path, "自动保存输入");
  debouncedSave();
});

document.getElementById("exportBtn").addEventListener("click", exportData);
document.getElementById("importInput").addEventListener("change", event => event.target.files[0] && importData(event.target.files[0]));
document.getElementById("resetBtn").addEventListener("click", resetData);

loadData();
render();
