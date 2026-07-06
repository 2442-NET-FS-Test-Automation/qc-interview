// Thin API client for the Worker. Stores the session token + passcode in
// localStorage (GitHub Pages + Worker is cross-origin, so a bearer token, not a cookie).
window.API = (function () {
  const base = () => (window.CONFIG && window.CONFIG.WORKER_URL || "").replace(/\/$/, "");
  const LS = {
    get token() { return localStorage.getItem("qc_token") || ""; },
    set token(v) { v ? localStorage.setItem("qc_token", v) : localStorage.removeItem("qc_token"); },
    get code() { return localStorage.getItem("qc_code") || ""; },
    set code(v) { v ? localStorage.setItem("qc_code", v) : localStorage.removeItem("qc_code"); },
    get name() { return localStorage.getItem("qc_name") || ""; },
    set name(v) { v ? localStorage.setItem("qc_name", v) : localStorage.removeItem("qc_name"); },
    get role() { return localStorage.getItem("qc_role") || ""; },
    set role(v) { v ? localStorage.setItem("qc_role", v) : localStorage.removeItem("qc_role"); },
  };

  async function req(method, path, body, opts) {
    opts = opts || {};
    const headers = {};
    if (body !== undefined && !opts.raw) headers["content-type"] = "application/json";
    if (opts.auth && LS.token) headers["authorization"] = "Bearer " + LS.token;
    if (opts.contentType) headers["content-type"] = opts.contentType;
    const res = await fetch(base() + path, {
      method,
      headers,
      body: body === undefined ? undefined : (opts.raw ? body : JSON.stringify(body)),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = { ok: false, error: "bad_response" }; }
    return data;
  }

  return {
    LS,
    logout() { LS.token = ""; LS.code = ""; LS.name = ""; LS.role = ""; },
    // ---- auth ----
    login: (code) => req("POST", "/auth/login", { code }),
    // ---- interview ----
    session: (passcode) => req("POST", "/session", { passcode }),
    startInterview: (opts) => req("POST", "/interview/start", Object.assign({ passcode: LS.code }, opts)),
    judge: (payload) => req("POST", "/judge", payload),
    finish: (interviewId) => req("POST", "/interview/finish", { interviewId }),
    myHistory: () => req("POST", "/my/history", { passcode: LS.code }),
    async transcribe(blob) {
      return req("POST", "/transcribe", blob, { raw: true, contentType: blob.type || "audio/webm" });
    },
    // ---- trainer (bearer token) ----
    overview: () => req("GET", "/trainer/overview", undefined, { auth: true }),
    report: (name) => req("GET", "/trainer/report?name=" + encodeURIComponent(name), undefined, { auth: true }),
    history: (name) => req("GET", "/trainer/history?name=" + encodeURIComponent(name), undefined, { auth: true }),
    generateReport: (name) => req("POST", "/trainer/report/generate", { name }, { auth: true }),
    listLogins: () => req("GET", "/auth/list", undefined, { auth: true }),
    invite: (payload) => req("POST", "/trainer/invite", payload, { auth: true }),
    addLogin: (payload) => req("POST", "/auth/add", payload, { auth: true }),
    resetLogin: (payload) => req("POST", "/auth/reset", payload, { auth: true }),
    revokeLogin: (name) => req("POST", "/auth/revoke", { name }, { auth: true }),
    cohorts: () => req("GET", "/trainer/cohorts", undefined, { auth: true }),
    addCohort: (cohort) => req("POST", "/trainer/cohort/add", { cohort }, { auth: true }),
  };
})();
