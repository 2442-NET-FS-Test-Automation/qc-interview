// Recording + speech-to-text. Records mic audio with MediaRecorder, uploads to the
// Worker's /transcribe (OpenAI Whisper) — more reliable and consistent across browsers
// than in-browser speech recognition. Computes delivery metrics for the judge.
window.QCRecorder = (function () {
  const FILLERS = ["um", "uh", "er", "ah", "like", "you know", "sort of", "kind of", "basically", "literally", "actually"];

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  function pickMime() {
    const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const t of opts) { if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; }
    return "";
  }

  function metrics(text, durationMs) {
    const clean = (text || "").trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    let fillerCount = 0;
    const low = " " + clean.toLowerCase() + " ";
    for (const f of FILLERS) {
      const re = new RegExp("\\b" + f.replace(/ /g, "\\s+") + "\\b", "g");
      const m = low.match(re); if (m) fillerCount += m.length;
    }
    const durSec = durationMs ? durationMs / 1000 : null;
    const wpm = durSec && durSec > 0 ? Math.round((words / durSec) * 60) : null;
    const fillerRate = words ? fillerCount / words : 0;
    return { words, durationMs: durationMs || null, wpm, fillerCount, fillerRate, mode: "audio" };
  }

  function create() {
    let stream = null, rec = null, chunks = [], startedAt = 0, mime = "";
    return {
      supported,
      async ensureMic() {
        if (stream) return true;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
      },
      start() {
        chunks = [];
        mime = pickMime();
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.start();
        startedAt = Date.now();
      },
      recording() { return rec && rec.state === "recording"; },
      stop() {
        return new Promise((resolve) => {
          if (!rec) return resolve(null);
          const durationMs = Date.now() - startedAt;
          rec.onstop = () => {
            const blob = new Blob(chunks, { type: mime || "audio/webm" });
            resolve({ blob, durationMs });
          };
          rec.stop();
        });
      },
      release() {
        try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
        stream = null; rec = null; chunks = [];
      },
      metrics,
    };
  }

  return { create, supported, metrics };
})();
