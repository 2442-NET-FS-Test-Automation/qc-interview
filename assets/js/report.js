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
  const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

  // The five scoring dimensions the judge returns, in a fixed display order.
  const DIM_KEYS = ["correctness", "depth", "clarity", "terminology", "completeness"];

  // Average each dimension across the answered questions (dims present) → radar data.
  function aggregateDims(pq) {
    const sum = {}, cnt = {};
    for (const p of pq || []) {
      if (!p || !p.dims) continue;
      for (const k of DIM_KEYS) { if (typeof p.dims[k] === "number") { sum[k] = (sum[k] || 0) + p.dims[k]; cnt[k] = (cnt[k] || 0) + 1; } }
    }
    const out = {};
    for (const k of DIM_KEYS) out[k] = cnt[k] ? Math.round(sum[k] / cnt[k]) : 0;
    return out;
  }

  // Horizontal metric bars for one question's dims.
  function dimBarsHTML(dims) {
    if (!dims) return "";
    return "<div class='dims' style='margin:8px 0'>" + DIM_KEYS.filter((k) => typeof dims[k] === "number").map((k) => {
      const v = dims[k];
      return "<div class='dimrow'><span class='muted'>" + cap(k) + "</span><span class='track'><i class='" + scoreClass(v) + "' style='width:" + v + "%'></i></span><span class='score " + scoreClass(v) + "'>" + v + "</span></div>";
    }).join("") + "</div>";
  }

  // Self-contained SVG radar/spider chart of the 5 metrics (values 0-100).
  // Colors default to CSS vars (on-page); pass explicit hex for the downloaded file.
  function radarSVG(dims, opts) {
    opts = opts || {};
    const stroke = opts.stroke || "var(--accent)";
    const fill = opts.fill || "var(--accent)";
    const grid = opts.grid || "var(--border)";
    const label = opts.label || "var(--muted)";
    const S = opts.size || 300, c = S / 2, r = S / 2 - 46, n = DIM_KEYS.length;
    const pt = (i, radius) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + radius * Math.cos(a), c + radius * Math.sin(a)]; };
    let g = "";
    // grid rings
    for (const ring of [0.25, 0.5, 0.75, 1]) {
      const pts = DIM_KEYS.map((_, i) => pt(i, r * ring).map((x) => x.toFixed(1)).join(",")).join(" ");
      g += "<polygon points='" + pts + "' fill='none' stroke='" + grid + "' stroke-width='1'/>";
    }
    // axes + labels
    let axes = "", labels = "";
    DIM_KEYS.forEach((k, i) => {
      const [x, y] = pt(i, r); axes += "<line x1='" + c + "' y1='" + c + "' x2='" + x.toFixed(1) + "' y2='" + y.toFixed(1) + "' stroke='" + grid + "' stroke-width='1'/>";
      const [lx, ly] = pt(i, r + 22); const anchor = Math.abs(lx - c) < 4 ? "middle" : (lx > c ? "start" : "end");
      labels += "<text x='" + lx.toFixed(1) + "' y='" + (ly + 4).toFixed(1) + "' text-anchor='" + anchor + "' font-size='11' font-weight='600' fill='" + label + "'>" + cap(k) + "</text>";
    });
    // data polygon
    const dpts = DIM_KEYS.map((k, i) => pt(i, r * ((dims[k] || 0) / 100)).map((x) => x.toFixed(1)).join(",")).join(" ");
    const poly = "<polygon points='" + dpts + "' fill='" + fill + "' fill-opacity='0.22' stroke='" + stroke + "' stroke-width='2' stroke-linejoin='round'/>";
    const dots = DIM_KEYS.map((k, i) => { const [x, y] = pt(i, r * ((dims[k] || 0) / 100)); return "<circle cx='" + x.toFixed(1) + "' cy='" + y.toFixed(1) + "' r='3' fill='" + stroke + "'/>"; }).join("");
    // Pad the viewBox horizontally so long axis labels (Completeness/Terminology) don't clip.
    const P = 58;
    return "<svg viewBox='" + (-P) + " -6 " + (S + 2 * P) + " " + (S + 12) + "' width='100%' style='max-width:" + (S + 2 * P) + "px' role='img' aria-label='Metric radar'>" + g + axes + poly + dots + labels + "</svg>";
  }

  // Question-by-question — each an expandable card revealing its metrics + feedback.
  function perQuestionHTML(pq) {
    return (pq || []).map((p) => {
      const s = typeof p.score === "number" ? p.score : 0;
      const str = (p.strengths && p.strengths.length) ? "<div class='small' style='margin-top:6px'><strong>Strengths:</strong> " + p.strengths.map(esc).join("; ") + "</div>" : "";
      const imp = (p.improvements && p.improvements.length) ? "<div class='small' style='margin-top:4px'><strong>To improve:</strong> " + p.improvements.map(esc).join("; ") + "</div>" : "";
      const model = p.modelAnswer ? "<details style='margin-top:6px'><summary class='small muted' style='cursor:pointer'>Model answer</summary><p class='small' style='margin:6px 0 0'>" + esc(p.modelAnswer) + "</p></details>" : "";
      return "<details class='card qcard' style='padding:0'>" +
        "<summary style='display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 14px; cursor:pointer; list-style:none'>" +
          "<span><span class='small muted'>Q" + ((p.idx != null ? p.idx : 0) + 1) + " · " + esc(p.topic || "") + "</span><br><span style='font-weight:600'>" + esc(p.prompt || "") + "</span></span>" +
          "<span class='score " + scoreClass(s) + "' style='font-size:1.15rem; flex:none'>" + s + "</span>" +
        "</summary>" +
        "<div style='padding:0 14px 14px'>" + dimBarsHTML(p.dims) + str + imp + model + "</div>" +
      "</details>";
    }).join("");
  }

  // Summary block (hero + strengths/focus/delivery) for inline past-report view.
  function summaryHTML(r) {
    const o = r.overall || {};
    const sc = r.score != null ? r.score : r.interviewScore;
    const agg = aggregateDims(r.perQuestion || []);
    const radar = DIM_KEYS.some((k) => agg[k] > 0) ? "<div class='radar-wrap' style='margin-bottom:8px'>" + radarSVG(agg, { size: 260 }) + "</div>" : "";
    return radar + "<div class='hero' style='margin-bottom:12px'>" +
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
    const dimLine = (p) => p.dims ? "<div class='small muted'><strong>Metrics:</strong> " + DIM_KEYS.filter((k) => typeof p.dims[k] === "number").map((k) => cap(k) + " " + p.dims[k]).join(" · ") + "</div>" : "";
    const per = (r.perQuestion || []).map((p) =>
      "<div class='q'><div><strong>Q" + ((p.idx != null ? p.idx : 0) + 1) + "</strong> · " + esc(p.topic || "") + " — <span class='sc'>" + (p.score || 0) + "/100</span></div>" +
      "<div style='margin:4px 0'>" + esc(p.prompt || "") + "</div>" + dimLine(p) +
      (p.strengths && p.strengths.length ? "<div class='small'><strong>Strengths:</strong> " + p.strengths.map(esc).join("; ") + "</div>" : "") +
      (p.improvements && p.improvements.length ? "<div class='small'><strong>To improve:</strong> " + p.improvements.map(esc).join("; ") + "</div>" : "") +
      (p.modelAnswer ? "<div class='small muted' style='margin-top:4px'><strong>Model answer:</strong> " + esc(p.modelAnswer) + "</div>" : "") + "</div>"
    ).join("");
    const agg = aggregateDims(r.perQuestion || []);
    const radar = DIM_KEYS.some((k) => agg[k] > 0)
      ? "<div style='text-align:center;margin:12px 0'>" + radarSVG(agg, { size: 300, stroke: "#4f46e5", fill: "#4f46e5", grid: "#e2e8f0", label: "#64748b" }) + "</div>" : "";
    return "<!doctype html><html><head><meta charset='utf-8'><title>Interview report</title><style>" + css + "</style></head><body>" +
      "<h1>.NET Practice Interview — Report</h1>" +
      "<p class='muted'>" + esc(name || "") + (r.at ? " · " + esc(fmtDate(r.at)) : "") + " · " + esc(labelFor(r)) + "</p>" +
      "<p><span class='big'>" + sc + "</span> / 100 — <strong>" + esc(verdict(sc)) + "</strong></p>" +
      radar +
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

  return { esc, scoreClass, verdict, fmtDate, labelFor, aggregateDims, dimBarsHTML, radarSVG, perQuestionHTML, summaryHTML, toHTMLDoc, download };
})();
