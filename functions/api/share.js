import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";
import { getIdentity } from "../_lib/identity.js";

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CODE_LENGTH = 300000;
const MAX_TITLE_LENGTH = 80;
const ALLOWED_LANGUAGES = new Set([
  "plaintext", "javascript", "typescript", "json", "html", "xml", "css",
  "python", "java", "c", "cpp", "csharp", "kotlin", "swift", "php",
  "ruby", "go", "rust", "shell", "sql", "markdown", "yaml"
]);

function randomId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

async function findAvailableId(kv) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const id = randomId();
    if (!(await kv.get(`share:${id}`))) return id;
  }
  return null;
}

export async function onRequestPost(context) {
  if (!context.env.CODE_SHARES) {
    return json({ error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다." }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "접속 비밀번호 인증이 필요합니다." }, 401);
  }

  const contentLength = Number(context.request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_CODE_LENGTH + 20000) {
    return json({ error: "코드가 너무 깁니다." }, 413);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  if (typeof body?.code !== "string") {
    return json({ error: "코드가 필요합니다." }, 400);
  }
  if (body.code.length > MAX_CODE_LENGTH) {
    return json({ error: "코드는 300,000자 이하만 공유할 수 있습니다." }, 413);
  }

  const language = ALLOWED_LANGUAGES.has(body.language) ? body.language : "plaintext";
  const languageSource = body.languageSource === "manual" ? "manual" : "detected";
  const visibility = body.visibility === "public" ? "public" : "protected";
  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";

  if (rawTitle.length > MAX_TITLE_LENGTH) {
    return json({ error: `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.` }, 400);
  }

  const id = await findAvailableId(context.env.CODE_SHARES);
  if (!id) {
    return json({ error: "공유 ID를 만들지 못했습니다. 다시 시도해 주세요." }, 503);
  }

  const identity = await getIdentity(context.request, context.env);
  const title = rawTitle || `코드 공유 ${id}`;
  const createdAt = new Date().toISOString();
  const record = {
    version: 2,
    id,
    title,
    code: body.code,
    language,
    languageSource,
    visibility,
    creatorProfile: identity.profile,
    creatorName: identity.name,
    ownerKey: identity.ownerKey,
    createdAt
  };
  const summary = {
    id,
    title,
    createdAt,
    visibility,
    creatorProfile: identity.profile,
    creatorName: identity.name
  };

  await Promise.all([
    context.env.CODE_SHARES.put(`share:${id}`, JSON.stringify(record)),
    context.env.CODE_SHARES.put(`owner:${identity.ownerKey}:${id}`, JSON.stringify(summary))
  ]);

  return json({
    id,
    title,
    creatorName: identity.name,
    path: `/share/${id}`
  }, 201);
}
