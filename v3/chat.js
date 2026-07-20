const WORKER_URL = "https://abhijit-portfolio-ai.guitarguitarabhijit.workers.dev/";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("ai-ab-toggle");
  const panel = document.getElementById("ai-ab-panel");
  const close = document.getElementById("ai-ab-close");
  const input = document.getElementById("ai-ab-input");
  const send = document.getElementById("ai-ab-send");
  const messages = document.getElementById("ai-ab-messages");
  if (!(toggle && panel && close && input && send && messages)) return;

  const suggestions = document.getElementById("ai-ab-suggest");
  const history = [];
  let sending = false;
  const finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  input.maxLength = 500;
  messages.setAttribute("aria-live", "polite");
  toggle.setAttribute("aria-expanded", "false");

  if (suggestions) {
    suggestions.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-q]");
      if (!chip) return;
      input.value = chip.getAttribute("data-q");
      suggestions.hidden = true;
      sendMessage();
    });
  }

  const nudge = document.getElementById("ai-ab-nudge");
  const nudgeClose = document.getElementById("ai-ab-nudge-close");
  let nudgeShown = false;

  function dismissNudge(remember) {
    if (nudge) nudge.hidden = true;
    if (!remember) return;
    try { sessionStorage.setItem("ai-ab-nudge-seen", "1"); } catch (error) {}
  }

  if (nudge) {
    window.setTimeout(() => {
      if (!nudge || nudgeShown || !panel.hidden) return;
      let seen = false;
      try { seen = sessionStorage.getItem("ai-ab-nudge-seen") === "1"; } catch (error) {}
      if (!seen) {
        nudgeShown = true;
        nudge.hidden = false;
      }
    }, 3500);

    nudge.addEventListener("click", (event) => {
      if (event.target !== nudgeClose) {
        dismissNudge(true);
        setPanelOpen(true);
      }
    });
  }

  if (nudgeClose) {
    const closeNudge = (event) => {
      event.stopPropagation();
      event.preventDefault();
      dismissNudge(true);
    };
    nudgeClose.addEventListener("click", closeNudge);
    nudgeClose.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") closeNudge(event);
    });
  }

  function setPanelOpen(isOpen) {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) dismissNudge(true);
    if (isOpen && finePointer) input.focus();
    if (!isOpen) toggle.focus();
  }

  function addMessage(content, type, id = null) {
    const node = document.createElement("div");
    node.className = `ai-ab-msg ai-ab-msg--${type}`;
    if (id) node.id = id;
    if (type === "loading") {
      node.innerHTML = '<span class="ai-ab-typing"><span></span><span></span><span></span></span>';
    } else {
      node.textContent = content;
      node.innerHTML = node.innerHTML
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
    }
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  }

  toggle.addEventListener("click", () => setPanelOpen(panel.hidden));
  close.addEventListener("click", () => setPanelOpen(false));
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPanelOpen(false);
  });

  const historyKey = "ai-ab-history";
  function saveHistory() {
    try { sessionStorage.setItem(historyKey, JSON.stringify(history.slice(-12))); } catch (error) {}
  }

  async function askWorker() {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!response.ok) {
      const error = new Error("AI Engine unavailable");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function sendMessage() {
    const query = input.value.trim();
    if (!query || sending) return;
    if (suggestions) suggestions.hidden = true;
    sending = true;
    send.disabled = true;
    addMessage(query, "user");
    input.value = "";
    history.push({ role: "user", content: query });
    if (history.length > 12) history.splice(0, history.length - 12);
    saveHistory();

    const loadingId = `ai-ab-loading-${Date.now()}`;
    addMessage("", "loading", loadingId);
    let payload = null;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
      try {
        payload = await askWorker();
        break;
      } catch (error) {
        lastError = error;
        if (error.status === 429) break;
      }
    }

    document.getElementById(loadingId)?.remove();
    if (payload) {
      let answer = "I'm sorry, I couldn't process that.";
      if (payload.choices && payload.choices[0] && payload.choices[0].message) {
        answer = payload.choices[0].message.content;
      } else if (payload.generated_text) {
        answer = payload.generated_text;
      }
      addMessage(answer, "ai");
      history.push({ role: "assistant", content: answer });
      saveHistory();
    } else {
      console.error(lastError);
      addMessage(
        lastError && lastError.status === 429
          ? "You're sending messages quickly — please wait a moment and try again."
          : "Can't reach the AI right now — please try again in a moment.",
        "error",
      );
      history.pop();
      input.value = query;
    }
    sending = false;
    send.disabled = false;
    if (finePointer) input.focus();
  }

  try {
    const savedHistory = JSON.parse(sessionStorage.getItem(historyKey) || "null");
    if (Array.isArray(savedHistory) && savedHistory.length) {
      savedHistory.forEach((entry) => {
        if (!entry || (entry.role !== "user" && entry.role !== "assistant") || typeof entry.content !== "string") return;
        history.push({ role: entry.role, content: entry.content });
        addMessage(entry.content, entry.role === "user" ? "user" : "ai");
      });
      if (history.length && suggestions) suggestions.hidden = true;
    }
  } catch (error) {}

  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) sendMessage();
  });
});
