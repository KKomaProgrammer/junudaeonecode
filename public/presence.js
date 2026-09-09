(() => {
  "use strict";

  const junwooStatus = document.getElementById("junwooPresence") || document.querySelector('[data-profile="junwoo"] span');
  const daewonStatus = document.getElementById("daewonPresence") || document.querySelector('[data-profile="daewon"] span');
  const identityName = document.getElementById("identityName");
  const identityDialog = document.getElementById("identityDialog");

  if (!junwooStatus || !daewonStatus) return;

  junwooStatus.classList.add("presence-status");
  daewonStatus.classList.add("presence-status");

  const style = document.createElement("style");
  style.textContent = `
    .presence-status[data-online="true"]{color:#18864b!important;font-weight:750}
    .presence-status[data-online="true"]::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#22a55b;margin-right:6px;vertical-align:1px;box-shadow:0 0 0 3px rgba(34,165,91,.12)}
    .presence-status[data-online="false"]{color:#727985!important}
  `;
  document.head.appendChild(style);

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
