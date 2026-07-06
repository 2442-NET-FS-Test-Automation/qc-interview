// Interview runner: dynamic QC/Day selection → record/transcribe/edit/submit → results.
(function () {
  if (!API.LS.token || !API.LS.code) { location.href = "index.html"; return; }
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const esc = QCReport.esc, scoreClass = QCReport.scoreClass;
  const screens = { pick: $("screen-pick"), run: $("screen-run"), done: $("screen-done"), past: $("screen-past") };
  function screen(name) { for (const k in screens) screens[k].classList.toggle("hidden", k !== name); window.scrollTo(0, 0); }

  $("who").textContent = API.LS.name ? "Signed in as " + API.LS.name : "";
  if (API.LS.role === "trainer") show($("dash-link"));
  $("logout").addEventListener("click", () => { API.logout(); location.href = "index.html"; });

  // ---- navbar tabs ----
  function setNav(tab) { $("nav-practice").setAttribute("aria-selected", tab === "practice"); $("nav-past").setAttribute("aria-selected", tab === "past"); }
  $("nav-practice").addEventListener("click", () => { setNav("practice"); screen("pick"); });
  $("nav-past").addEventListener("click", () => { setNav("past"); screen("past"); loadPast(); });

  // ---- state ----
  let questions = [], interviewId = null, cur = 0;
  let sel = null;              // current selection {mode, qc?, day?, title, topics, statLabel}
  let quota = { practice: true, remaining: 99, max: 4 };
  let lastReport = null;       // built at finish for download
  let last = null;             // {blob, durationMs}
  let pending = [];            // in-flight background judge promises
  const recorder = QCRecorder.create();

  // ---- resume persistence ----
  // An in-progress interview is saved so a refresh/crash/lost connection doesn't lose
  // it (and doesn't re-spend OpenAI calls on already-answered questions — those are
  // graded server-side). Valid for ~6h (matches the server-side interview TTL).
  const RESUME_KEY = "qc_active_" + API.LS.code;
  const RESUME_TTL = 6 * 60 * 60 * 1000;
  function saveActive() {
    if (!interviewId || !sel) return;
    try { localStorage.setItem(RESUME_KEY, JSON.stringify({ interviewId, questions, cur, sel: { title: sel.title, mode: sel.mode, qc: sel.qc, day: sel.day, week: sel.week }, at: Date.now() })); } catch (e) {}
  }
  function clearActive() { try { localStorage.removeItem(RESUME_KEY); } catch (e) {} }
  function loadActive() {
    try {
      const raw = localStorage.getItem(RESUME_KEY); if (!raw) return null;
      const a = JSON.parse(raw);
      if (!a || !a.interviewId || !Array.isArray(a.questions) || (Date.now() - (a.at || 0)) > RESUME_TTL) { clearActive(); return null; }
      return a;
    } catch (e) { return null; }
  }

  // ---- quota ----
  async function loadQuota() {
    try {
      const s = await API.session(API.LS.code);
      if (s && s.ok) {
        quota = { practice: !!s.practice, remaining: s.attemptsRemaining, max: s.maxPerDay || 4, used: s.attemptsUsed || 0 };
      }
    } catch (e) {}
    renderQuota();
  }
  function renderQuota() {
    const lbl = $("quota-label"), bar = $("quota-bar");
    if (quota.practice) { lbl.textContent = "Unlimited practice (trainer / tester account)"; bar.style.width = "0%"; bar.parentElement.style.display = "none"; return; }
    bar.parentElement.style.display = "";
    lbl.innerHTML = "<strong>" + quota.remaining + "</strong> of " + quota.max + " attempts left today";
    bar.style.width = Math.round(((quota.max - quota.remaining) / quota.max) * 100) + "%";
    bar.style.background = quota.remaining === 0 ? "var(--bad)" : "var(--accent)";
  }
  function attemptsLeft() { return quota.practice || quota.remaining > 0; }

  // ---- segmented ----
  $("seg-qc").addEventListener("click", () => setMode("qc"));
  $("seg-day").addEventListener("click", () => setMode("day"));
  function setMode(m) {
    $("seg-qc").setAttribute("aria-selected", m === "qc"); $("seg-day").setAttribute("aria-selected", m === "day");
    $("panel-qc").classList.toggle("hidden", m !== "qc"); $("panel-day").classList.toggle("hidden", m !== "day");
    clearSelection();
  }

  // ---- build QC cards ----
  (function buildQC() {
    $("qc-cards").innerHTML = (CONFIG.QC_MODULES || []).map((m) => {
      const chips = m.topics.slice(0, 4).map((t) => "<span class='chip'>" + esc(t) + "</span>").join("") +
        (m.topics.length > 4 ? "<span class='chip'>+" + (m.topics.length - 4) + "</span>" : "");
      return "<button class='selcard' data-qc='" + esc(m.topic) + "'>" +
        "<div class='row' style='gap:10px'><span class='code'>" + esc(m.code) + "</span><span class='chip accent'>" + esc(m.difficulty) + "</span></div>" +
        "<div class='title'>" + esc(m.label) + "</div>" +
        "<div class='muted small' style='margin:-2px 0 2px'>" + esc(m.blurb) + "</div>" +
        "<div class='meta'>" + CONFIG.INTERVIEW_LEN + " questions <span class='dot'>·</span> ~" + CONFIG.EST_MIN + " min</div>" +
        "<div class='chips'>" + chips + "</div></button>";
    }).join("");
    $("qc-cards").querySelectorAll("[data-qc]").forEach((b) => b.addEventListener("click", () => {
      const m = CONFIG.QC_MODULES.find((x) => x.topic === b.dataset.qc);
      selectCard(b, "qc-cards");
      sel = { mode: "qc", qc: m.topic, title: m.code + " · " + m.label, topics: m.topics, statLabel: m.difficulty };
      fillExpect();
    }));
  })();

  // ---- build Day picker: week tabs + one week's day cards ----
  let activeWeek = (CONFIG.CURRICULUM && CONFIG.CURRICULUM[0]) ? CONFIG.CURRICULUM[0].week : 1;
  (function buildWeekTabs() {
    $("week-tabs").innerHTML = (CONFIG.CURRICULUM || []).map((w) =>
      "<button data-week='" + w.week + "' aria-selected='" + (w.week === activeWeek) + "'>Week " + w.week + "</button>").join("");
    $("week-tabs").querySelectorAll("[data-week]").forEach((b) => b.addEventListener("click", () => {
      activeWeek = +b.dataset.week; renderWeek();
    }));
  })();
  function renderWeek() {
    $("week-tabs").querySelectorAll("[data-week]").forEach((b) => b.setAttribute("aria-selected", (+b.dataset.week === activeWeek)));
    const w = CONFIG.CURRICULUM.find((x) => x.week === activeWeek);
    if (!w) return;
    $("day-cards").innerHTML = (w.days || []).map((d) => {
      const chips = d.topics.slice(0, 3).map((t) => "<span class='chip'>" + esc(t) + "</span>").join("") +
        (d.topics.length > 3 ? "<span class='chip'>+" + (d.topics.length - 3) + "</span>" : "");
      return "<button class='selcard' data-day='" + esc(d.id) + "'>" +
        "<span class='code'>Day " + d.d + "</span>" +
        "<div class='title'>" + esc(d.title) + "</div>" +
        "<div class='chips'>" + chips + "</div></button>";
    }).join("");
    $("day-cards").querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => {
      const dd = w.days.find((x) => x.id === b.dataset.day);
      selectCard(b, "day-cards");
      sel = { mode: "day", day: dd.id, week: w.week, title: "Week " + w.week + " · Day " + dd.d + " — " + dd.title, topics: dd.topics, statLabel: "Week " + w.week };
      fillExpect();
    }));
  }
  renderWeek();

  function selectCard(btn, containerId) {
    $(containerId).querySelectorAll(".selcard").forEach((c) => c.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
  }
  function clearSelection() { sel = null; hide($("expect")); show($("expect-empty")); document.querySelectorAll(".selcard").forEach((c) => c.setAttribute("aria-pressed", "false")); }

  function fillExpect() {
    $("expect-title").textContent = sel.title;
    $("expect-badge").textContent = sel.statLabel || "";
    $("expect-stats").innerHTML = "<span>🎤 " + CONFIG.INTERVIEW_LEN + " questions</span><span>⏱ ~" + CONFIG.EST_MIN + " min</span>" +
      (sel.mode === "day" ? "<span>📚 cumulative through this day</span>" : "<span>🎯 full competency exam</span>");
    $("expect-topics").innerHTML = sel.topics.map((t) => "<span class='chip accent'>" + esc(t) + "</span>").join("");
    const btn = $("start-btn");
    if (!attemptsLeft()) { btn.disabled = true; btn.textContent = "No attempts left today"; }
    else { btn.disabled = false; btn.textContent = "Start interview →"; }
    hide($("pick-err")); hide($("expect-empty")); show($("expect"));
  }

  function pickErr(msg) { const e = $("pick-err"); e.textContent = msg; show(e); }

  // ---- start ----
  $("start-btn").addEventListener("click", async () => {
    if (!sel) return;
    if (!attemptsLeft()) { pickErr("You've used all of today's attempts. Come back tomorrow!"); return; }
    const btn = $("start-btn"); btn.disabled = true; btn.textContent = "Starting…";
    const opts = sel.mode === "qc" ? { qc: sel.qc } : { day: sel.day };
    try {
      const r = await API.startInterview(opts);
      if (!r || !r.ok) { pickErr(r && r.error === "cap_reached" ? "You've hit today's attempt limit." : "Couldn't start the interview. Try again."); btn.disabled = false; btn.textContent = "Start interview →"; return; }
      questions = r.questions || []; interviewId = r.interviewId; cur = 0; pending = [];
      if (!questions.length) { pickErr("No questions available for that selection yet."); btn.disabled = false; btn.textContent = "Start interview →"; return; }
      hide($("grading-note")); saveActive(); screen("run"); renderQuestion();
    } catch (e) { pickErr("Couldn't reach the server. Check your connection."); btn.disabled = false; btn.textContent = "Start interview →"; }
  });

  const TOPIC_LABEL = { "web-frontend": "Web", "react-msa": "React / MSA", "dotnet-testing": "Testing", "selenium-azure": "Selenium / Azure", "devops": "DevOps", "ai-engineering": "AI" };
  (CONFIG.QC_MODULES || []).forEach((m) => { TOPIC_LABEL[m.topic] = m.code; });

  function renderQuestion() {
    const q = questions[cur]; last = null;
    $("run-label").textContent = sel ? sel.title : "";
    $("run-count").textContent = "Question " + (cur + 1) + " of " + questions.length;
    $("run-bar").style.width = Math.round((cur / questions.length) * 100) + "%";
    $("q-topic").textContent = TOPIC_LABEL[q.topic] || q.topic;
    $("q-type").textContent = q.type === "scenario" ? "Applied scenario" : "Concept";
    $("q-prompt").textContent = q.prompt;
    show($("answer-card")); hide($("transcript-block")); hide($("transcribe-status"));
    $("transcript").value = ""; $("rec-state").textContent = "";
    const sub = $("submit-btn"); sub.disabled = false; sub.textContent = (cur + 1 >= questions.length) ? "Submit & finish →" : "Submit & continue →";
    const recBtn = $("rec-btn"); recBtn.textContent = "● Record answer"; recBtn.disabled = false; recBtn.classList.remove("danger"); show(recBtn);
    if (!QCRecorder.supported()) { show($("transcript-block")); hide(recBtn); }
  }

  // ---- recording ----
  $("rec-btn").addEventListener("click", async () => {
    const btn = $("rec-btn");
    if (!recorder.recording()) {
      try { await recorder.ensureMic(); }
      catch (e) { $("rec-state").textContent = "Microphone blocked — you can type your answer instead."; show($("transcript-block")); hide(btn); return; }
      recorder.start(); btn.textContent = "■ Stop recording"; btn.classList.add("danger");
      $("rec-state").innerHTML = "<span class='recdot'></span> Recording… speak your answer.";
    } else {
      btn.disabled = true; btn.textContent = "Stopping…"; last = await recorder.stop(); $("rec-state").textContent = ""; await transcribe();
    }
  });
  $("rerecord-btn").addEventListener("click", () => {
    hide($("transcript-block")); const btn = $("rec-btn");
    btn.textContent = "● Record answer"; btn.disabled = false; btn.classList.remove("danger"); show(btn);
    $("transcript").value = ""; last = null;
  });
  async function transcribe() {
    if (!last || !last.blob) { show($("transcript-block")); return; }
    show($("transcribe-status"));
    try {
      const r = await API.transcribe(last.blob);
      $("transcript").value = (r && r.ok && r.text) ? r.text : "";
      if (!r || !r.ok) $("rec-state").textContent = "Transcription had trouble — please check/type your answer below.";
    } catch (e) { $("rec-state").textContent = "Transcription failed — you can type your answer below."; }
    finally { hide($("transcribe-status")); show($("transcript-block")); }
  }

  // ---- submit (async background grading) ----
  // Fire the grade in the background and advance immediately — the learner never waits
  // between questions, and all feedback + the overall are shown together at the end.
  $("submit-btn").addEventListener("click", () => {
    const q = questions[cur]; const text = ($("transcript").value || "").trim();
    if (!text) { $("rec-state").textContent = "Please record or type an answer first."; return; }
    const delivery = QCRecorder.metrics(text, last ? last.durationMs : null);
    pending.push(API.judge({ interviewId, questionId: q.id, transcript: text, delivery }).catch(() => null));
    show($("grading-note"));
    advance();
  });

  function advance() {
    cur++; saveActive();
    if (cur >= questions.length) finish();
    else renderQuestion();
  }

  // ---- finish early ----
  $("finish-early-btn").addEventListener("click", () => {
    const remaining = questions.length - cur;
    if (remaining > 0 && !confirm(
      "Finish now and see your report?\n\n" + remaining + " remaining question" + (remaining === 1 ? "" : "s") +
      " will be scored as no response, which lowers your overall score.")) return;
    finish();
  });

  // ---- finish / results ----
  let finishing = false;
  async function finish() {
    if (finishing) return; finishing = true;
    recorder.release(); clearActive(); screen("done");
    $("done-summary").innerHTML = "<span class='spinner'></span> Grading your answers…";
    try {
      if (pending.length) await Promise.allSettled(pending);   // let background grades land
      const r = await API.finish(interviewId);
      if (!r || !r.ok) { $("done-summary").textContent = "Couldn't load your summary, but your answers were saved."; finishing = false; return; }
      lastReport = { at: new Date().toISOString(), qc: sel && sel.qc, day: sel && sel.day, week: sel && sel.week, score: r.interviewScore, overall: r.overall, perQuestion: r.perQuestion };
      renderResults(r);
      loadQuota();     // refresh remaining attempts
    } catch (e) { $("done-summary").textContent = "Couldn't reach the server for the summary."; }
    finishing = false;
  }
  function renderResults(r) {
    const o = r.overall || {};
    const sc = $("done-score"); sc.textContent = r.interviewScore; sc.className = "big score " + scoreClass(r.interviewScore);
    $("done-verdict").textContent = QCReport.verdict(r.interviewScore);
    $("done-best").classList.toggle("hidden", !r.personalBestToday);
    $("done-summary").textContent = o.summary || "";
    $("done-strengths").innerHTML = (o.topStrengths || []).map((x) => "<li>" + esc(x) + "</li>").join("") || "<li class='muted'>—</li>";
    $("done-focus").innerHTML = (o.focusAreas || []).map((x) => "<li>" + esc(x) + "</li>").join("") || "<li class='muted'>—</li>";
    $("done-soft").textContent = o.softSkills || "—";
    $("done-radar").innerHTML = QCReport.radarSVG(QCReport.aggregateDims(r.perQuestion));
    $("done-per").innerHTML = QCReport.perQuestionHTML(r.perQuestion);
  }
  $("download-btn").addEventListener("click", () => { if (lastReport) QCReport.download(lastReport, API.LS.name); });
  $("again-btn").addEventListener("click", () => { setNav("practice"); screen("pick"); });

  // ---- past interviews ----
  async function loadPast() {
    $("past-list").innerHTML = "<p class='muted small'>Loading…</p>";
    try {
      const r = await API.myHistory();
      const hist = (r && r.ok && r.history) ? r.history : [];
      if (!hist.length) { $("past-list").innerHTML = "<p class='muted small'>No completed interviews yet. Finish one and it'll appear here.</p>"; return; }
      $("past-list").innerHTML = hist.map((h, i) =>
        "<div class='card' style='padding:14px'><div class='row between'>" +
        "<div><strong>" + esc(QCReport.labelFor(h)) + "</strong><div class='tiny muted'>" + esc(QCReport.fmtDate(h.at)) + "</div></div>" +
        "<div class='row'><span class='score " + scoreClass(h.score) + "' style='font-size:1.2rem'>" + h.score + "</span>" +
        "<button class='btn ghost small' data-view='" + i + "'>View</button>" +
        "<button class='btn ghost small' data-dl='" + i + "'>⬇</button></div></div>" +
        "<div class='past-detail hidden' id='pd-" + i + "' style='margin-top:12px'></div></div>"
      ).join("");
      $("past-list").querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.view, box = $("pd-" + i);
        if (!box.classList.contains("hidden")) { box.classList.add("hidden"); b.textContent = "View"; return; }
        box.innerHTML = QCReport.summaryHTML(hist[i]) + "<details style='margin-top:8px'><summary class='small muted' style='cursor:pointer'>Question-by-question</summary><div class='stack' style='margin-top:8px'>" + QCReport.perQuestionHTML(hist[i].perQuestion) + "</div></details>";
        box.classList.remove("hidden"); b.textContent = "Hide";
      }));
      $("past-list").querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => QCReport.download(hist[+b.dataset.dl], API.LS.name)));
    } catch (e) { $("past-list").innerHTML = "<p class='muted small'>Couldn't load your past interviews. Try again.</p>"; }
  }

  // ---- resume an in-progress interview ----
  function initResume() {
    const a = loadActive();
    if (!a) return;
    show($("resume-banner"));
    $("resume-info").textContent = (a.sel && a.sel.title ? a.sel.title + " · " : "") + "Question " + (a.cur + 1) + " of " + a.questions.length;
    $("resume-btn").onclick = () => {
      questions = a.questions; interviewId = a.interviewId; cur = a.cur; pending = [];
      sel = a.sel || { title: "Interview" };
      hide($("resume-banner")); hide($("grading-note")); screen("run"); renderQuestion();
    };
    $("discard-btn").onclick = () => { clearActive(); hide($("resume-banner")); };
  }

  // ---- init ----
  setNav("practice");
  setMode("qc");
  loadQuota();
  initResume();
})();
