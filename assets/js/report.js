// Shared report rendering + download. Used by the results screen, the "past
// interviews" review, and the downloadable HTML file.
window.QCReport = (function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const scoreClass = (s) => s == null ? "" : (s >= 80 ? "hi" : s >= 65 ? "mid" : "lo");
  const verdict = (s) => s >= 85 ? "Excellent" : s >= 75 ? "Strong" : s >= 65 ? "Solid" : s >= 50 ? "Developing" : "Needs work";
  const fmtDate = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };

  // Human label for a report/history entry from its mode + qc/day.
  function labelFor(r) {
    if (r.qc) { const m = (CONFIG.QC_MODULES || []).find((x) => x.topic === r.qc); return m ? (m.code + " · " + m.label) : r.qc.toUpperCase(); }
    if (r.day) {
      for (const w of (CONFIG.CURRICULUM || [])) { const dd = (w.days || []).find((x) => x.id === r.day); if (dd) return "Week " + w.week + " · Day " + dd.d + " — " + dd.title; }
      return r.day;
    }
    if (r.week) return "Week " + r.week;
    return "Interview";
  }

  const li = (arr) => (arr || []).map((x) => "<li>" + esc(x) + "</li>").join("");

  // Question-by-question feedback block (full detail).
  function perQuestionHTML(pq) {
    return (pq || []).map((p) => {
      const s = typeof p.score === "number" ? p.score : 0;
      const str = (p.strengths && p.strengths.length) ? "<div class='small'><strong>Strengths:</strong> " + p.strengths.map(esc).join("; ") + "</div>" : "";
      const imp = (p.improvements && p.improvements.length) ? "<div class='small'><strong>To improve:</strong> " + p.improvements.map(esc).join("; ") + "</div>" : "";
      const model = p.modelAnswer ? "<details><summary class='small muted' style='cursor:pointer'>Model answer</summary><p class='small' style='margin:6px 0 0'>" + esc(p.modelAnswer) + "</p></details>" : "";
      return "<div class='card' style='padding:14px'>" +
        "<div class='row between'><span class='small muted'>Q" + ((p.idx != null ? p.idx : 0) + 1) + " · " + esc(p.topic || "") + "</span><span class='score " + scoreClass(s) + "'>" + s + "</span></div>" +
        "<div style='margin:6px 0; font-weight:600'>" + esc(p.prompt || "") + "</div>" + str + imp + model + "</div>";
    }).join("");
  }

  // Summary block (hero + strengths/focus/delivery) for inline past-report view.
  function summaryHTML(r) {
    const o = r.overall || {};
    const sc = r.score != null ? r.score : r.interviewScore;
    return "<div class='hero' style='margin-bottom:12px'>" +
      "<div class='big score " + scoreClass(sc) + "'>" + sc + "</div>" +
      "<div style='flex:1; min-width:200px'><div class='chip'>" + esc(verdict(sc)) + "</div>" +
      "<p class='muted small' style='margin:8px 0 0'>" + esc(o.summary || "") + "</p></div></div>" +
      (o.topStrengths && o.topStrengths.length ? "<div class='small'><strong>Top strengths</strong><ul style='margin:4px 0 8px; padding-left:18px'>" + li(o.topStrengths) + "</ul></div>" : "") +
      (o.focusAreas && o.focusAreas.length ? "<div class='small'><strong>Focus areas</strong><ul style='margin:4px 0 8px; padding-left:18px'>" + li(o.focusAreas) + "</ul></div>" : "") +
      (o.softSkills ? "<div class='small muted'><strong>Delivery:</strong> " + esc(o.softSkills) + "</div>" : "");
  }

  // A self-contained HTML document for download / print.
  function toHTMLDoc(r, name) {
    const sc = r.score != null ? r.score : r.interviewScore;
    const css = "body{font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:760px;margin:32px auto;padding:0 20px}" +
      "h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.1rem;margin:22px 0 8px;border-top:1px solid #e2e8f0;padding-top:16px}" +
      ".big{font-size:2.6rem;font-weight:800}.q{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin:8px 0}" +
      ".muted{color:#64748b}ul{margin:4px 0}small,.small{font-size:.85rem}.sc{font-weight:800}";
    const o = r.overall || {};
    const per = (r.perQuestion || []).map((p) =>
      "<div class='q'><div><strong>Q" + ((p.idx != null ? p.idx : 0) + 1) + "</strong> · " + esc(p.topic || "") + " — <span class='sc'>" + (p.score || 0) + "/100</span></div>" +
      "<div style='margin:4px 0'>" + esc(p.prompt || "") + "</div>" +
      (p.strengths && p.strengths.length ? "<div class='small'><strong>Strengths:</strong> " + p.strengths.map(esc).join("; ") + "</div>" : "") +
      (p.improvements && p.improvements.length ? "<div class='small'><strong>To improve:</strong> " + p.improvements.map(esc).join("; ") + "</div>" : "") +
      (p.modelAnswer ? "<div class='small muted' style='margin-top:4px'><strong>Model answer:</strong> " + esc(p.modelAnswer) + "</div>" : "") + "</div>"
    ).join("");
    return "<!doctype html><html><head><meta charset='utf-8'><title>Interview report</title><style>" + css + "</style></head><body>" +
      "<h1>.NET Practice Interview — Report</h1>" +
      "<p class='muted'>" + esc(name || "") + (r.at ? " · " + esc(fmtDate(r.at)) : "") + " · " + esc(labelFor(r)) + "</p>" +
      "<p><span class='big'>" + sc + "</span> / 100 — <strong>" + esc(verdict(sc)) + "</strong></p>" +
      (o.summary ? "<p>" + esc(o.summary) + "</p>" : "") +
      (o.topStrengths && o.topStrengths.length ? "<h2>Top strengths</h2><ul>" + li(o.topStrengths) + "</ul>" : "") +
      (o.focusAreas && o.focusAreas.length ? "<h2>Focus areas</h2><ul>" + li(o.focusAreas) + "</ul>" : "") +
      (o.softSkills ? "<h2>Delivery</h2><p class='muted'>" + esc(o.softSkills) + "</p>" : "") +
      "<h2>Question-by-question</h2>" + per + "</body></html>";
  }

  function download(r, name) {
    const doc = toHTMLDoc(r, name);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = (r.at || new Date().toISOString()).slice(0, 10);
    a.href = url; a.download = "qc-interview-report-" + stamp + ".html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { esc, scoreClass, verdict, fmtDate, labelFor, perQuestionHTML, summaryHTML, toHTMLDoc, download };
})();
