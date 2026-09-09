import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CODE_LENGTH = 300000;
const ALLOWED_LANGUAGES = new Set([
  "plaintext",
  "javascript",
  "typescript",
  "json",
  "html",
  "xml",
  "css",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "kotlin",
  "swift",
  "php",
  "ruby",
  "go",
  "rust",
  "shell",
  "sql",
  "markdown",
  "yaml"
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
    const exists = await kv.get(`share:${id}`);
    if (!exists) return id;
  }
  return null;
}

export async function onRequestPost(context) {
  if (!context.env.CODE_SHARES) {
    return json({
      error: "Cloudflare KV 바인딩 CODE_SHARES가 설정되지 않았습니다."
    }, 500);
  }

  if (
    hasAccessPassword(context.env) &&
    !(await isAuthorizedRequest(context.request, context.env))
  ) {
    return json({ error: "접속 비밀번호 인증이 필요합니다." }, 401);
  }

  const contentLength = Number(context.request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_CODE_LENGTH + 10000) {
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

  const language = ALLOWED_LANGUAGES.has(body.language)
    ? body.language
    : "plaintext";
  const languageSource = body.languageSource === "manual" ? "manual" : "detected";
  const visibility = body.visibility === "public" ? "public" : "protected";

  const id = await findAvailableId(context.env.CODE_SHARES);
  if (!id) {
    return json({ error: "공유 ID를 만들지 못했습니다. 다시 시도해 주세요." }, 503);
  }

  const record = {
    version: 1,
    id,
    code: body.code,
    language,
    languageSource,
    visibility,
    createdAt: new Date().toISOString()
  };

  await context.env.CODE_SHARES.put(
    `share:${id}`,
    JSON.stringify(record)
  );

  return json({ id, path: `/share/${id}` }, 201);
}
