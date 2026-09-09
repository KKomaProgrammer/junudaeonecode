import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";
import {
  PROFILE_NAMES,
  getIdentity
} from "../_lib/identity.js";
import {
  ONLINE_WINDOW_MS,
  getPresenceSummary,
  markPresenceOffline,
  markPresenceOnline
} from "../_lib/presence.js";

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

  const profiles = await getPresenceSummary(context.env, PROFILE_NAMES);
  return json({ onlineWindowMs: ONLINE_WINDOW_MS, profiles });
}

export async function onRequestPost(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const identity = await getIdentity(context.request, context.env);
  const action = body?.action === "leave" ? "leave" : "heartbeat";
  const sessionId = body?.sessionId;

  if (action === "leave") {
    const recorded = await markPresenceOffline(context.env, identity, sessionId);
    return json({ recorded, action, profile: identity.profile, name: identity.name });
  }

  const recorded = await markPresenceOnline(context.env, identity, sessionId);
  return json({
    recorded,
    action,
    profile: identity.profile,
    name: identity.name,
    lastSeen: recorded ? new Date().toISOString() : null
  });
}
