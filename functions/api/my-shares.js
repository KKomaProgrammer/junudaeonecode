import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";
import { getIdentity } from "../_lib/identity.js";

export async function onRequestGet(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "내 공유 링크를 보려면 접속 비밀번호 인증이 필요합니다." }, 401);
  }

  const identity = await getIdentity(context.request, context.env);
  const prefix = `owner:${identity.ownerKey}:`;
  const shares = [];
  let cursor;

  do {
    const page = await context.env.CODE_SHARES.list({ prefix, cursor, limit: 100 });
    const batch = await Promise.all(
      page.keys.map((key) => context.env.CODE_SHARES.get(key.name, "json"))
    );
    for (const item of batch) {
      if (!item?.id) continue;
      shares.push({
        id: item.id,
        title: item.title || `코드 공유 ${item.id}`,
        createdAt: item.createdAt || null,
        visibility: item.visibility === "public" ? "public" : "protected",
        creatorName: item.creatorName || identity.name
      });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && shares.length < 500);

  shares.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  return json({
    profile: identity.profile,
    name: identity.name,
    networkId: identity.networkId,
    shares: shares.slice(0, 500)
  });
}
