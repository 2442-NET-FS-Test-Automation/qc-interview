// Interview runner: mode pick → record/transcribe/edit/submit per question → results.
(function () {
  // ---- guard ----
  if (!API.LS.token || !API.LS.code) { location.href = "index.html"; return; }
  if (API.LS.role === "trainer") { /* trainers can still practice; allow */ }

  const $ = (id) => document.getElementById(id);
  const show = (el) => el.classList.remove("hidden");
  const hide = (el) => el.classList.add("hidden");
  const screens = { pick: $("screen-pick"), run: $("screen-run"), done: $("screen-done") };
  function screen(name) { for (const k in screens) screens[k].classList.toggle("hidden", k !== name); window.scrollTo(0, 0); }

  $("who").textContent = API.LS.name ? "Signed in as " + API.LS.name : "";
  $("logout").addEventListener("click", () => { API.logout(); location.href = "index.html"; });

  // ---- state ----
  let questions = [], interviewId = null, cur = 0, runLabel = "";
  let last = null;                 // {blob, durationMs} from the recorder
  const recorder = QCRecorder.create();

  // ---- mic status ----
  (function micStatus() {
    if (!QCRecorder.supported()) {
      $("mic-status").innerHTML = "⚠️ This browser can't record audio — you'll be able to type your answers instead. For the best experience use Chrome, Edge, or Safari.";
    } else {
      $("mic-status").innerHTML = "🎙️ You'll be asked for microphone access when the interview starts. You can re-record any answer.";
    }
  })();

  // ---- build pickers ----
  (function buildPickers() {
    const qc = $("qc-choices");
    (CONFIG.QC_MODULES || []).forEach((m) => {
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.textContent = m.label;
      b.addEventListener("click", () => start({ qc: m.topic }, m.label));
      qc.appendChild(b);
    });
    const weekSel = $("week"), daySel = $("day");
    (CONFIG.WEEKS || []).forEach((w) => {
      const o = document.createElement("option"); o.value = w.week; o.textContent = w.label; o.dataset.days = JSON.stringify(w.days);
      weekSel.appendChild(o);
    });
    function fillDays() {
      const opt = weekSel.options[weekSel.selectedIndex];
      const days = opt ? JSON.parse(opt.dataset.days) : [];
      daySel.innerHTML = "";
      days.forEach((d) => { const o = document.createElement("option"); o.value = d; o.textContent = "Day " + d; daySel.appendChild(o); });
    }
    weekSel.addEventListener("change", fillDays); fillDays();
    $("start-day").addEventListener("click", () => {
      const w = weekSel.value, d = daySel.value;
      const day = "w" + String(w).padStart(2, "0") + "d" + d;
      const label = "Week " + w + " · Day " + d;
      start({ day }, label);
    });
  })();

  function pickErr(msg) { const e = $("pick-err"); e.textContent = msg; show(e); }

  async function start(opts, label) {
    hide($("pick-err"));
    runLabel = label;
    try {
      const r = await API.startInterview(opts);
      if (!r || !r.ok) { pickErr(r && r.error === "cap_reached" ? "You've hit today's practice limit. Come back tomorrow!" : "Couldn't start the interview. Try again."); return; }
      questions = r.questions || [];
      interviewId = r.interviewId;
      cur = 0;
      if (!questions.length) { pickErr("No questions available for that selection yet."); return; }
      screen("run");
      renderQuestion();
    } catch (e) { pickErr("Couldn't reach the server. Check your connection."); }
  }

  const TOPIC_LABEL = {};
  (CONFIG.QC_MODULES || []).forEach((m) => { TOPIC_LABEL[m.topic] = m.label.split("·")[0].trim(); });

  function renderQuestion() {
    const q = questions[cur];
    last = null;
    $("run-label").textContent = runLabel;
    $("run-count").textContent = "Question " + (cur + 1) + " of " + questions.length;
    $("run-bar").style.width = Math.round((cur / questions.length) * 100) + "%";
    $("q-topic").textContent = TOPIC_LABEL[q.topic] || q.topic;
    $("q-type").textContent = q.type === "scenario" ? "Applied scenario" : "Concept";
    $("q-prompt").textContent = q.prompt;
    // reset answer/feedback UI
    hide($("fb-card")); show($("answer-card"));
    hide($("transcript-block")); hide($("transcribe-status"));
    $("transcript").value = "";
    $("rec-state").textContent = "";
    const recBtn = $("rec-btn");
    recBtn.textContent = "● Record answer"; recBtn.disabled = false; recBtn.classList.remove("danger");
    show(recBtn);
    if (!QCRecorder.supported()) {
      // Typing fallback: reveal the transcript box straight away.
      show($("transcript-block")); hide(recBtn);
      $("rec-state").textContent = "";
    }
  }

  // ---- recording ----
  $("rec-btn").addEventListener("click", async () => {
    const btn = $("rec-btn");
    if (!recorder.recording()) {
      try { await recorder.ensureMic(); }
      catch (e) {
        $("rec-state").textContent = "Microphone blocked — you can type your answer instead.";
        show($("transcript-block")); hide(btn); return;
      }
      recorder.start();
      btn.textContent = "■ Stop recording"; btn.classList.add("danger");
      $("rec-state").innerHTML = '<span class="dot rec"></span> Recording… speak your answer.';
    } else {
      btn.disabled = true; btn.textContent = "Stopping…";
      last = await recorder.stop();
      $("rec-state").textContent = "";
      await transcribe();
    }
  });

  $("rerecord-btn").addEventListener("click", () => {
    hide($("transcript-block"));
    const btn = $("rec-btn");
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
    } catch (e) {
      $("rec-state").textContent = "Transcription failed — you can type your answer below.";
    } finally {
      hide($("transcribe-status")); show($("transcript-block"));
    }
  }

  // ---- submit ----
  $("submit-btn").addEventListener("click", async () => {
    const q = questions[cur];
    const text = ($("transcript").value || "").trim();
    if (!text) { $("rec-state").textContent = "Please record or type an answer first."; return; }
    const btn = $("submit-btn"); btn.disabled = true; btn.textContent = "Scoring…";
    const delivery = QCRecorder.metrics(text, last ? last.durationMs : null);
    try {
      const r = await API.judge({ interviewId, questionId: q.id, transcript: text, delivery });
      if (!r || !r.ok) { $("rec-state").textContent = "Scoring failed — try submitting again."; return; }
      showFeedback(r);
    } catch (e) {
      $("rec-state").textContent = "Couldn't reach the server — try again.";
    } finally { btn.disabled = false; btn.textContent = "Submit answer"; }
  });

  function scoreClass(s) { return s >= 80 ? "hi" : s >= 65 ? "mid" : "lo"; }
  function list(items) { return (items || []).map((x) => "<li>" + esc(x) + "</li>").join(""); }
  function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  function showFeedback(r) {
    hide($("answer-card"));
    const fb = $("fb-card"); show(fb);
    const sc = $("fb-score"); sc.textContent = r.score + " / 100"; sc.className = "score " + scoreClass(r.score);
    const dims = r.dims || {};
    $("fb-dims").innerHTML = Object.keys(dims).map((k) => '<span class="pill">' + k + " " + dims[k] + "</span>").join(" ");
    $("fb-strengths").innerHTML = (r.strengths && r.strengths.length) ? "<strong>Strengths</strong><ul>" + list(r.strengths) + "</ul>" : "";
    $("fb-improvements").innerHTML = (r.improvements && r.improvements.length) ? "<strong>To improve</strong><ul>" + list(r.improvements) + "</ul>" : "";
    $("fb-model").textContent = r.modelAnswer || "";
    $("next-btn").textContent = (cur + 1 >= questions.length) ? "See results →" : "Next question →";
    fb.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("next-btn").addEventListener("click", async () => {
    cur++;
    if (cur >= questions.length) { await finish(); }
    else { renderQuestion(); }
  });

  async function finish() {
    recorder.release();
    screen("done");
    $("done-summary").textContent = "Tallying your results…";
    try {
      const r = await API.finish(interviewId);
      if (!r || !r.ok) { $("done-summary").textContent = "Couldn't load your summary, but your answers were saved."; return; }
      renderResults(r);
    } catch (e) { $("done-summary").textContent = "Couldn't reach the server for the summary."; }
  }

  function renderResults(r) {
    $("done-score").innerHTML = '<span class="score ' + scoreClass(r.interviewScore) + '">' + r.interviewScore + "</span><span class='muted' style='font-size:1rem'> / 100</span>";
    $("done-best").classList.toggle("hidden", !r.personalBestToday);
    const o = r.overall || {};
    $("done-summary").textContent = o.summary || "";
    $("done-strengths").innerHTML = list(o.topStrengths) || "<li class='muted'>—</li>";
    $("done-focus").innerHTML = list(o.focusAreas) || "<li class='muted'>—</li>";
    $("done-soft").textContent = o.softSkills || "—";
    const rows = (r.perQuestion || []).map((p) =>
      "<tr><td>" + (p.idx + 1) + "</td><td>" + esc((p.prompt || "").slice(0, 90)) + (p.prompt && p.prompt.length > 90 ? "…" : "") +
      "</td><td class='score " + scoreClass(p.score) + "'>" + p.score + "</td></tr>"
    ).join("");
    $("done-per").innerHTML = "<table><thead><tr><th>#</th><th>Question</th><th>Score</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  $("again-btn").addEventListener("click", () => { screen("pick"); });
})();
