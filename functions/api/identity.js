import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";
import {
  PROFILE_IDS,
  getIdentity,
  profileName,
  setIdentity
} from "../_lib/identity.js";
import {
  clearNetworkPresence
} from "../_lib/presence.js";

async function migrateVisitorShares(env, networkId, newProfile) {
  if (!env.CODE_SHARES || newProfile === "visitor") return;

  const oldOwnerKey = `visitor:${networkId}`;
  const newOwnerKey = `profile:${newProfile}`;
  const prefix = `owner:${oldOwnerKey}:`;
  let cursor;

  do {
    const page = await env.CODE_SHARES.list({ prefix, cursor, limit: 100 });
    for (const key of page.keys) {
      const summary = await env.CODE_SHARES.get(key.name, "json");
      const id = summary?.id || key.name.split(":").pop();
      if (!id) continue;

      const shareKey = `share:${id}`;
      const share = await env.CODE_SHARES.get(shareKey, "json");
      if (!share || share.ownerKey !== oldOwnerKey) {
        await env.CODE_SHARES.delete(key.name);
        continue;
      }

      const updatedShare = {
        ...share,
        ownerKey: newOwnerKey,
        creatorProfile: newProfile,
        creatorName: profileName(newProfile)
      };
      const updatedSummary = {
        id,
        title: updatedShare.title || `코드 공유 ${id}`,
        createdAt: updatedShare.createdAt || null,
        visibility: updatedShare.visibility === "public" ? "public" : "protected",
        creatorProfile: newProfile,
        creatorName: profileName(newProfile)
      };

      await Promise.all([
        env.CODE_SHARES.put(shareKey, JSON.stringify(updatedShare)),
        env.CODE_SHARES.put(`owner:${newOwnerKey}:${id}`, JSON.stringify(updatedSummary)),
        env.CODE_SHARES.delete(key.name)
      ]);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export async function onRequestGet(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  const identity = await getIdentity(context.request, context.env);
  const canSwitch = !hasAccessPassword(context.env) ||
    await isAuthorizedRequest(context.request, context.env);

  return json({
    profile: identity.profile,
    name: identity.name,
    networkId: identity.networkId,
    canSwitch
  });
}

export async function onRequestPut(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "프로필을 바꾸려면 접속 비밀번호 인증이 필요합니다." }, 401);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const profile = String(body?.profile || "");
  if (!PROFILE_IDS.has(profile)) {
    return json({ error: "올바르지 않은 프로필입니다." }, 400);
  }

  const before = await getIdentity(context.request, context.env);

  if (before.profile !== profile) {
    await clearNetworkPresence(context.env, before.networkId, before.profile);
  }

  if (before.profile === "visitor" && profile !== "visitor") {
    await migrateVisitorShares(context.env, before.networkId, profile);
  }

  const identity = await setIdentity(context.request, context.env, profile);
  return json({
    profile: identity.profile,
    name: identity.name,
    networkId: identity.networkId,
    canSwitch: true
  });
}
