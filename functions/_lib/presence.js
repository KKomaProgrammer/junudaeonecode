const NAMED_PROFILES = new Set(["junwoo", "daewon"]);
export const ONLINE_WINDOW_MS = 45000;

function safeSessionId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(id) ? id : null;
}

function devicePrefix(networkId) {
  return `presence-device:${networkId}:`;
}

function deviceKey(networkId, sessionId) {
  return `${devicePrefix(networkId)}${sessionId}`;
}

function lastSeenKey(profile) {
  return `presence-last:${profile}`;
}

function normalizeTime(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function isNamedProfile(profile) {
  return NAMED_PROFILES.has(profile);
}

export async function markPresenceOnline(env, identity, sessionId) {
  if (!env.CODE_SHARES || !isNamedProfile(identity?.profile)) return false;
  const safeId = safeSessionId(sessionId);
  if (!safeId) return false;

  const now = new Date().toISOString();
  const record = {
    profile: identity.profile,
    networkId: identity.networkId,
    sessionId: safeId,
    lastSeen: now
  };

  await Promise.all([
    env.CODE_SHARES.put(
      deviceKey(identity.networkId, safeId),
      JSON.stringify(record),
      { expirationTtl: 120 }
    ),
    env.CODE_SHARES.put(lastSeenKey(identity.profile), now)
  ]);
  return true;
}

export async function markPresenceOffline(env, identity, sessionId) {
  if (!env.CODE_SHARES) return false;
  const safeId = safeSessionId(sessionId);
  if (!safeId) return false;

  const now = new Date().toISOString();
  const tasks = [env.CODE_SHARES.delete(deviceKey(identity.networkId, safeId))];
  if (isNamedProfile(identity?.profile)) {
    tasks.push(env.CODE_SHARES.put(lastSeenKey(identity.profile), now));
  }
  await Promise.all(tasks);
  return true;
}

export async function clearNetworkPresence(env, networkId, previousProfile = null) {
  if (!env.CODE_SHARES || !networkId) return;
  const prefix = devicePrefix(networkId);
  let cursor;
  do {
    const page = await env.CODE_SHARES.list({ prefix, cursor, limit: 100 });
    await Promise.all(page.keys.map((key) => env.CODE_SHARES.delete(key.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  if (isNamedProfile(previousProfile)) {
    await env.CODE_SHARES.put(lastSeenKey(previousProfile), new Date().toISOString());
  }
}

async function readAllDeviceRecords(env) {
  const records = [];
  let cursor;
  do {
    const page = await env.CODE_SHARES.list({ prefix: "presence-device:", cursor, limit: 100 });
    for (const key of page.keys) {
      const record = await env.CODE_SHARES.get(key.name, "json");
      if (record) records.push(record);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return records;
}

export async function getPresenceSummary(env, profileNames) {
  const now = Date.now();
  const records = await readAllDeviceRecords(env);
  const result = {};

  for (const profile of ["junwoo", "daewon"]) {
    const active = records.filter((record) => {
      if (record?.profile !== profile) return false;
      const time = Date.parse(record.lastSeen || "");
      return Number.isFinite(time) && now - time <= ONLINE_WINDOW_MS;
    });

    let lastSeen = normalizeTime(await env.CODE_SHARES.get(lastSeenKey(profile)));
    for (const record of records.filter((item) => item?.profile === profile)) {
      const normalized = normalizeTime(record.lastSeen);
      if (normalized && (!lastSeen || Date.parse(normalized) > Date.parse(lastSeen))) {
        lastSeen = normalized;
      }
    }

    result[profile] = {
      profile,
      name: profileNames[profile],
      online: active.length > 0,
      activeSessions: active.length,
      lastSeen
    };
  }

  return result;
}
