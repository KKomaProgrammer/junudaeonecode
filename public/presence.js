(() => {
  "use strict";

  const junwooStatus = document.getElementById("junwooPresence");
  const daewonStatus = document.getElementById("daewonPresence");
  const identityName = document.getElementById("identityName");
  const identityDialog = document.getElementById("identityDialog");

  if (!junwooStatus || !daewonStatus) return;

  const refs = {
    junwoo: junwooStatus,
    daewon: daewonStatus
  };

  let refreshTimer = null;
  let heartbeatTimer = null;
  let busy = false;

  function formatLastSeen(value) {
    if (!value) return "접속 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "접속 기록 없음";
    return `마지막 접속 ${date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })}`;
  }

  function renderProfile(profile, data) {
    const element = refs[profile];
    if (!element) return;

    if (!data) {
      element.textContent = "상태 확인 불가";
      element.dataset.online = "false";
      return;
    }

    if (data.online) {
      element.textContent = "접속 중";
      element.dataset.online = "true";
    } else {
      element.textContent = formatLastSeen(data.lastSeen);
      element.dataset.online = "false";
    }
  }

  function renderUnavailable(message = "로그인 후 상태 확인") {
    for (const element of Object.values(refs)) {
      element.textContent = message;
      element.dataset.online = "false";
    }
  }

  async function sendHeartbeat() {
    if (document.visibilityState !== "visible") return;
    try {
      await fetch("/api/presence", {
        method: "POST",
        cache: "no-store",
        keepalive: true
      });
    } catch {}
  }

  async function refreshPresence() {
    if (busy) return;
    busy = true;
    try {
      const response = await fetch("/api/presence", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        renderUnavailable(response.status === 401 ? "로그인 후 상태 확인" : "상태 확인 불가");
        return;
      }
      renderProfile("junwoo", data.profiles?.junwoo);
      renderProfile("daewon", data.profiles?.daewon);
    } catch {
      renderUnavailable("상태 확인 불가");
    } finally {
      busy = false;
    }
  }

  async function heartbeatAndRefresh() {
    await sendHeartbeat();
    await refreshPresence();
  }

  function startTimers() {
    clearInterval(refreshTimer);
    clearInterval(heartbeatTimer);
    refreshTimer = setInterval(refreshPresence, 20000);
    heartbeatTimer = setInterval(sendHeartbeat, 45000);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") heartbeatAndRefresh();
  });

  identityDialog?.addEventListener("close", () => {
    setTimeout(heartbeatAndRefresh, 250);
  });

  if (identityName) {
    const observer = new MutationObserver(() => {
      setTimeout(heartbeatAndRefresh, 250);
    });
    observer.observe(identityName, { childList: true, characterData: true, subtree: true });
  }

  heartbeatAndRefresh();
  startTimers();
})();
