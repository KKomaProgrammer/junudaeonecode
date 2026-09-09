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

  const refs = { junwoo: junwooStatus, daewon: daewonStatus };
  const SESSION_KEY = "junudae_presence_session_v2";
  const REFRESH_MS = 3000;
  const HEARTBEAT_MS = 15000;

  let refreshTimer = null;
  let heartbeatTimer = null;
  let busy = false;
  let leaving = false;

  function makeSessionId() {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch {
      return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    }
  }

  const sessionId = makeSessionId();

  function formatLastSeen(value) {
    if (!value) return "접속 기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "접속 기록 없음";
    return `마지막 접속 ${date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
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
      const count = Number(data.activeSessions || 0);
      element.textContent = count > 1 ? `접속 중 · ${count}개 세션` : "접속 중";
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

  async function postPresence(action = "heartbeat", keepalive = false) {
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        cache: "no-store",
        keepalive,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId })
      });
      const data = await response.json().catch(() => ({}));
      return response.ok ? data : null;
    } catch {
      return null;
    }
  }

  function beaconLeave() {
    if (leaving) return;
    leaving = true;
    const body = JSON.stringify({ action: "leave", sessionId });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/presence", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/presence", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body
        }).catch(() => {});
      }
    } catch {}
  }

  async function sendHeartbeat() {
    if (document.visibilityState !== "visible") return null;
    leaving = false;
    return postPresence("heartbeat", true);
  }

  async function refreshPresence() {
    if (busy) return;
    busy = true;
    try {
      const response = await fetch(`/api/presence?_=${Date.now()}`, { cache: "no-store" });
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
    const heartbeat = await sendHeartbeat();
    await refreshPresence();
    if (heartbeat?.recorded && refs[heartbeat.profile]) {
      renderProfile(heartbeat.profile, {
        online: true,
        activeSessions: 1,
        lastSeen: heartbeat.lastSeen
      });
    }
  }

  function startTimers() {
    clearInterval(refreshTimer);
    clearInterval(heartbeatTimer);
    refreshTimer = setInterval(refreshPresence, REFRESH_MS);
    heartbeatTimer = setInterval(async () => {
      const heartbeat = await sendHeartbeat();
      if (heartbeat?.recorded && refs[heartbeat.profile]) {
        refs[heartbeat.profile].dataset.online = "true";
        if (!refs[heartbeat.profile].textContent.startsWith("접속 중")) {
          refs[heartbeat.profile].textContent = "접속 중";
        }
      }
    }, HEARTBEAT_MS);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      leaving = false;
      heartbeatAndRefresh();
    } else {
      beaconLeave();
    }
  });

  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) beaconLeave();
  });
  window.addEventListener("beforeunload", beaconLeave);

  identityDialog?.addEventListener("close", () => {
    setTimeout(heartbeatAndRefresh, 80);
  });

  if (identityName) {
    const observer = new MutationObserver(() => {
      setTimeout(heartbeatAndRefresh, 80);
    });
    observer.observe(identityName, { childList: true, characterData: true, subtree: true });
  }

  heartbeatAndRefresh();
  startTimers();
})();
