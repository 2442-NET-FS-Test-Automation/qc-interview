// Login page. Reads ?code= from the invite link, logs in, redirects by role.
(function () {
  const codeEl = document.getElementById("code");
  const goEl = document.getElementById("go");
  const errEl = document.getElementById("err");

  // Prefill from invite link (?code=...).
  const params = new URLSearchParams(location.search);
  const pre = params.get("code");
  if (pre) codeEl.value = pre.trim();

  // Already logged in? Skip straight through.
  if (API.LS.token && API.LS.role) redirect(API.LS.role);

  function redirect(role) {
    location.href = role === "trainer" ? "trainer.html" : "interview.html";
  }
  function showErr(msg) { errEl.textContent = msg; errEl.classList.remove("hidden"); }

  async function submit() {
    const code = (codeEl.value || "").trim();
    if (!code) return showErr("Enter your passcode.");
    goEl.disabled = true; goEl.textContent = "Checking…"; errEl.classList.add("hidden");
    try {
      const r = await API.login(code);
      if (!r || !r.ok) { showErr("That passcode wasn't recognized. Check it and try again."); return; }
      API.LS.token = r.token; API.LS.code = code; API.LS.name = r.name || ""; API.LS.role = r.role || "learner";
      redirect(API.LS.role);
    } catch (e) {
      showErr("Couldn't reach the server. Check your connection and try again.");
    } finally {
      goEl.disabled = false; goEl.textContent = "Log in";
    }
  }

  goEl.addEventListener("click", submit);
  codeEl.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  codeEl.focus();
})();
