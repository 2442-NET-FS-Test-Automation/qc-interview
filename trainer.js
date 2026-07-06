// Trainer dashboard: invite by email, roster overview, per-trainee report + history.
(function () {
  if (!API.LS.token) { location.href = "index.html"; return; }
  if (API.LS.role !== "trainer") { location.href = "interview.html"; return; }

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const scoreClass = (s) => s == null ? "" : (s >= 80 ? "hi" : s >= 65 ? "mid" : "lo");
  const fmtDate = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return "—"; } };

  $("who").textContent = API.LS.name ? "Signed in as " + API.LS.name : "";
  $("logout").addEventListener("click", () => { API.logout(); location.href = "index.html"; });

  // Cache history-by-name so "last interview" column can be filled + drawer reuse.
  let lastByName = {};
  let rosterLearners = [];  // current roster order (index-addressed by the View buttons)

  // ---- invite ----
  $("invite-btn").addEventListener("click", async () => {
    const emails = ($("emails").value || "").trim();
    if (!emails) { $("invite-status").textContent = "Enter at least one email."; return; }
    const cohort = ($("inv-cohort").value || "").trim();
    const role = $("inv-role").value;
    const btn = $("invite-btn"); btn.disabled = true; $("invite-status").textContent = "Sending…";
    try {
      const r = await API.invite({ emails, role, cohort });
      if (!r || !r.ok) { $("invite-status").textContent = r && r.error === "no_valid_emails" ? "No valid emails found." : "Invite failed."; return; }
      $("invite-status").textContent = r.count + " processed.";
      $("invite-results").innerHTML = "<table><thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Passcode</th></tr></thead><tbody>" +
        r.results.map((x) => {
          const sent = x.emailed && x.emailed.ok;
          const status = sent ? '<span class="pill good">emailed</span>' : '<span class="pill warn">' + esc((x.emailed && x.emailed.error) || "not sent") + "</span>";
          const tag = x.reset ? " <span class='pill'>reset</span>" : "";
          return "<tr><td>" + esc(x.email) + "</td><td>" + esc(x.name) + tag + "</td><td>" + status + "</td><td><code>" + esc(x.code) + "</code></td></tr>";
        }).join("") + "</tbody></table>" +
        "<p class='muted small'>Passcodes are shown here once so you can hand them over if an email didn't send.</p>";
      $("emails").value = "";
      loadRoster();
    } catch (e) { $("invite-status").textContent = "Couldn't reach the server."; }
    finally { btn.disabled = false; }
  });

  // ---- roster ----
  async function loadRoster() {
    $("roster-status").textContent = "Loading…";
    try {
      const r = await API.overview();
      if (!r || !r.ok) { $("roster-status").textContent = "Couldn't load the roster."; return; }
      const learners = (r.learners || []).filter((l) => l.role !== "practice");
      // Pull each trainee's most recent interview time (best-effort, parallel).
      await Promise.all(learners.map(async (l) => {
        try { const h = await API.history(l.name); lastByName[l.name] = (h && h.history) ? h.history : []; } catch (e) { lastByName[l.name] = []; }
      }));
      // Sort: most recently active first.
      learners.sort((a, b) => {
        const ta = (lastByName[a.name][0] || {}).at || ""; const tb = (lastByName[b.name][0] || {}).at || "";
        return tb.localeCompare(ta);
      });
      rosterLearners = learners;
      const tb = $("roster").querySelector("tbody");
      tb.innerHTML = learners.map((l, i) => {
        const hist = lastByName[l.name] || [];
        const last = hist[0];
        const recent = i === 0 && last ? " ⭐" : "";
        const weak = (l.weakConcepts || []).slice(0, 4).map((w) => '<span class="pill warn">' + esc(w) + "</span>").join(" ") || '<span class="muted">none</span>';
        return "<tr data-name='" + esc(l.name) + "'>" +
          "<td><strong>" + esc(l.name) + "</strong>" + recent + "</td>" +
          "<td>" + esc(l.cohort || "—") + "</td>" +
          "<td class='score " + scoreClass(l.interviewBest) + "'>" + (l.interviewBest != null ? l.interviewBest : "—") + "</td>" +
          "<td>" + (last ? fmtDate(last.at) + " <span class='score " + scoreClass(last.score) + "'>(" + last.score + ")</span>" : "—") + "</td>" +
          "<td>" + (l.daysCompleted != null ? l.daysCompleted : "—") + "</td>" +
          "<td>" + weak + "</td>" +
          "<td><button class='btn ghost small' data-open='" + i + "'>View</button></td></tr>";
      }).join("");
      $("roster-status").textContent = learners.length + " trainee(s). ⭐ = most recently active.";
      tb.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => { const l = rosterLearners[+b.dataset.open]; if (l) openDetail(l.name); }));
    } catch (e) { $("roster-status").textContent = "Couldn't reach the server."; }
  }
  $("refresh").addEventListener("click", loadRoster);

  // ---- detail drawer (Overall + History tabs) ----
  let currentName = null, currentHistCount = 0;
  function setDetailTab(tab) {
    $("dtab-overall").setAttribute("aria-selected", tab === "overall");
    $("dtab-history").setAttribute("aria-selected", tab === "history");
    $("dpane-overall").classList.toggle("hidden", tab !== "overall");
    $("dpane-history").classList.toggle("hidden", tab !== "history");
  }
  $("dtab-overall").addEventListener("click", () => setDetailTab("overall"));
  $("dtab-history").addEventListener("click", () => setDetailTab("history"));

  function openDetail(name) {
    currentName = name;
    currentHistCount = (lastByName[name] || []).length;
    $("detail-name").textContent = name;
    $("detail").classList.remove("hidden");
    setDetailTab("overall");
    $("report-body").innerHTML = "<p class='muted small'>Loading report…</p>";
    renderHistory(lastByName[name] || []);
    loadReport(name);
    $("detail").scrollIntoView({ behavior: "smooth" });
  }
  $("detail-close").addEventListener("click", () => $("detail").classList.add("hidden"));

  function renderReport(rep) {
    if (!rep) {
      $("report-body").innerHTML = "<p class='muted small'>" + (currentHistCount
        ? "No overall report generated yet. This trainee has completed <strong>" + currentHistCount + "</strong> interview" + (currentHistCount === 1 ? "" : "s") + " — generate an overall to summarize their week."
        : "This trainee hasn't completed any interviews yet, so there's nothing to summarize.") + "</p>";
      $("gen-report").disabled = !currentHistCount;
      return;
    }
    $("gen-report").disabled = false;
    const li = (arr) => (arr || []).map((x) => "<li>" + esc(x) + "</li>").join("");
    $("report-body").innerHTML =
      "<p class='small muted'>Report generated " + fmtDate(rep.generatedAt) + "</p>" +
      "<p><strong>Summary.</strong> " + esc(rep.summary) + "</p>" +
      "<p><strong>Progress.</strong> " + esc(rep.progress) + "</p>" +
      (rep.weakPoints && rep.weakPoints.length ? "<p><strong>Weak points</strong></p><ul class='small'>" + li(rep.weakPoints) + "</ul>" : "") +
      (rep.actionItems && rep.actionItems.length ? "<p><strong>Action items</strong></p><ul class='small'>" + li(rep.actionItems) + "</ul>" : "");
  }
  async function loadReport(name) {
    try { const r = await API.report(name); renderReport(r && r.report); } catch (e) { $("report-body").innerHTML = "<p class='muted small'>Couldn't load report.</p>"; }
  }
  $("gen-report").addEventListener("click", async () => {
    if (!currentName) return;
    $("report-status").textContent = "Generating…"; $("gen-report").disabled = true;
    try { const r = await API.generateReport(currentName); renderReport(r && r.report); $("report-status").textContent = "Done."; }
    catch (e) { $("report-status").textContent = "Failed."; }
    finally { $("gen-report").disabled = false; setTimeout(() => $("report-status").textContent = "", 2500); }
  });

  // Each completed interview is expandable to the SAME full report a learner sees
  // (radar + per-question metrics + feedback) and downloadable.
  function renderHistory(hist) {
    if (!hist || !hist.length) { $("history-body").innerHTML = "<p class='muted'>No completed interviews yet.</p>"; return; }
    $("history-body").innerHTML = hist.map((h, i) =>
      "<div class='card' style='padding:14px; margin-bottom:8px'><div class='row between'>" +
      "<div><strong>" + esc(QCReport.labelFor(h)) + "</strong><div class='tiny muted'>" + esc(QCReport.fmtDate(h.at)) + "</div></div>" +
      "<div class='row'><span class='score " + (QCReport.scoreClass(h.score)) + "' style='font-size:1.2rem'>" + h.score + "</span>" +
      "<button class='btn ghost small' data-thview='" + i + "'>View report</button>" +
      "<button class='btn ghost small' data-thdl='" + i + "'>⬇</button></div></div>" +
      "<div class='hidden' id='thd-" + i + "' style='margin-top:12px'></div></div>"
    ).join("");
    $("history-body").querySelectorAll("[data-thview]").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.thview, box = document.getElementById("thd-" + i);
      if (!box.classList.contains("hidden")) { box.classList.add("hidden"); b.textContent = "View report"; return; }
      box.innerHTML = QCReport.summaryHTML(hist[i]) +
        "<h4 style='margin:12px 0 6px'>Question-by-question</h4><div class='stack'>" + QCReport.perQuestionHTML(hist[i].perQuestion) + "</div>";
      box.classList.remove("hidden"); b.textContent = "Hide report";
    }));
    $("history-body").querySelectorAll("[data-thdl]").forEach((b) => b.addEventListener("click", () => QCReport.download(hist[+b.dataset.thdl], currentName)));
  }

  loadRoster();
})();
