import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";
import {
  getIdentity,
  profileName
} from "../_lib/identity.js";

const NAMED_PROFILES = ["junwoo", "daewon"];
const ONLINE_WINDOW_MS = 120000;

function presenceKey(profile) {
  return `presence:${profile}`;
}

function normalizeLastSeen(value) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

async function readPresence(env, profile, now) {
  const lastSeen = normalizeLastSeen(await env.CODE_SHARES.get(presenceKey(profile)));
  const online = Boolean(lastSeen) && now - Date.parse(lastSeen) <= ONLINE_WINDOW_MS;
  return {
    profile,
    name: profileName(profile),
    online,
    lastSeen
  };
}

export async function onRequestGet(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "접속 상태를 보려면 로그인해야 합니다." }, 401);
  }

  const now = Date.now();
  const profiles = await Promise.all(
    NAMED_PROFILES.map((profile) => readPresence(context.env, profile, now))
  );

  return json({
    onlineWindowMs: ONLINE_WINDOW_MS,
    profiles: Object.fromEntries(profiles.map((item) => [item.profile, item]))
  });
}

export async function onRequestPost(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  const identity = await getIdentity(context.request, context.env);
  if (!NAMED_PROFILES.includes(identity.profile)) {
    return json({ recorded: false, profile: identity.profile });
  }

  const now = new Date().toISOString();
  await context.env.CODE_SHARES.put(presenceKey(identity.profile), now);

  return json({
    recorded: true,
    profile: identity.profile,
    name: identity.name,
    lastSeen: now
  });
}
