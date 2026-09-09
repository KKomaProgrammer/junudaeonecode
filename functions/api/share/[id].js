import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../../_lib/auth.js";

export async function onRequestGet(context) {
  if (!context.env.CODE_SHARES) {
    return json({
      error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다."
    }, 500);
  }

  const id = String(context.params.id || "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(id)) {
    return json({ error: "올바르지 않은 공유 ID입니다." }, 400);
  }

  const share = await context.env.CODE_SHARES.get(`share:${id}`, "json");
  if (!share) {
    return json({ error: "공유 코드를 찾을 수 없습니다." }, 404);
  }

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

  return json({
    id: share.id || id,
    code: typeof share.code === "string" ? share.code : "",
    language: share.language || "plaintext",
    languageSource: share.languageSource === "manual" ? "manual" : "detected",
    visibility: share.visibility === "public" ? "public" : "protected",
    createdAt: share.createdAt || null
  });
}
