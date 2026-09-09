import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../../_lib/auth.js";
import { getIdentity } from "../../_lib/identity.js";

function normalizeId(value) {
  const id = String(value || "").toUpperCase();
  return /^[A-Z0-9]{4}$/.test(id) ? id : null;
}

export async function onRequestGet(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  const id = normalizeId(context.params.id);
  if (!id) return json({ error: "올바르지 않은 공유 ID입니다." }, 400);

  const share = await context.env.CODE_SHARES.get(`share:${id}`, "json");
  if (!share) return json({ error: "공유 코드를 찾을 수 없습니다." }, 404);

  const protectedShare = share.visibility !== "public";
  if (
    protectedShare &&
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({
      error: "이 공유 링크를 보려면 접속 비밀번호가 필요합니다.",
      requiresPassword: true
    }, 401);
  }

  const identity = await getIdentity(context.request, context.env);
  const authorizedForDelete = !hasAccessPassword(context.env) ||
    await isAuthorizedRequest(context.request, context.env);
  const canDelete = Boolean(
    authorizedForDelete &&
    share.ownerKey &&
    share.ownerKey === identity.ownerKey
  );

  return json({
    id: share.id || id,
    title: share.title || `코드 공유 ${id}`,
    code: typeof share.code === "string" ? share.code : "",
    language: share.language || "plaintext",
    languageSource: share.languageSource === "manual" ? "manual" : "detected",
    visibility: share.visibility === "public" ? "public" : "protected",
    creatorProfile: share.creatorProfile || null,
    creatorName: share.creatorName || "알 수 없음",
    createdAt: share.createdAt || null,
    canDelete
  });
}

export async function onRequestDelete(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "공유 링크를 삭제하려면 접속 비밀번호 인증이 필요합니다." }, 401);
  }

  const id = normalizeId(context.params.id);
  if (!id) return json({ error: "올바르지 않은 공유 ID입니다." }, 400);

  const share = await context.env.CODE_SHARES.get(`share:${id}`, "json");
  if (!share) return json({ error: "공유 코드를 찾을 수 없습니다." }, 404);

  const identity = await getIdentity(context.request, context.env);
  if (!share.ownerKey || share.ownerKey !== identity.ownerKey) {
    return json({ error: "이 공유 링크를 만든 프로필에서만 삭제할 수 있습니다." }, 403);
  }

  await Promise.all([
    context.env.CODE_SHARES.delete(`share:${id}`),
    context.env.CODE_SHARES.delete(`owner:${share.ownerKey}:${id}`)
  ]);

  return json({ deleted: true, id });
}
